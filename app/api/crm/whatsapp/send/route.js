import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import dbConnect from '@/lib/dbConnect';
import Conversation from '@/models/Conversation';
import Lead from '@/models/Lead';
import { apiDebugLog } from '@/lib/apiDebugLog';

export const dynamic = 'force-dynamic';

const WHATSAPP_PROVIDER = process.env.WHATSAPP_PROVIDER || 'internal';
const WHATSAPP_SERVER_URL = process.env.WHATSAPP_LOCAL_URL || 'http://localhost:3002';
const DIALOG_360_API_KEY = process.env.DIALOG_360_API_KEY;

function normalizePhone(phone) {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '972' + cleaned.substring(1);
  if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
  return cleaned;
}

async function sendVia360Dialog(to, message) {
  if (!DIALOG_360_API_KEY) {
    throw new Error('360dialog API key not configured. Set DIALOG_360_API_KEY in environment variables.');
  }
  const normalizedTo = normalizePhone(to).replace('+', '');
  const response = await fetch('https://waba.360dialog.io/v1/messages', {
    method: 'POST',
    headers: {
      'D360-API-KEY': DIALOG_360_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizedTo,
      type: 'text',
      text: { body: message },
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || data.errors?.[0]?.details || 'Failed to send via 360dialog');
  }
  return {
    success: true,
    messageId: data.messages?.[0]?.id || `360d_${Date.now()}`,
    provider: '360dialog',
    to: normalizedTo,
  };
}

async function sendViaBaileys(to, message) {
  const response = await fetch(`${WHATSAPP_SERVER_URL}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, message }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Failed to send');
  return { success: true, messageId: result.messageId, provider: 'baileys', to };
}

async function sendMock(to, message) {
  apiDebugLog(`[WhatsApp Mock] Send to ${to}: ${message}`);
  return { success: true, messageId: `mock_${Date.now()}`, provider: 'mock', to };
}

async function POSTHandler(request) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, message, leadId, templateId } = await request.json();

    if (!to || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Send via configured provider
    let result;
    if (WHATSAPP_PROVIDER === '360dialog') {
      result = await sendVia360Dialog(to, message);
    } else if (WHATSAPP_PROVIDER === 'local') {
      result = await sendViaBaileys(to, message);
    } else {
      result = await sendMock(to, message);
    }

    await dbConnect();

    // Update lead's last contact and SLA status
    if (leadId) {
      const lead = await Lead.findById(leadId);
      if (lead) {
        const updates = {
          lastContactAt: new Date(),
        };

        // If this is the first response, mark SLA as met and record first response time
        if (!lead.firstResponseAt && lead.slaStatus === 'pending') {
          updates.firstResponseAt = new Date();
          updates.slaStatus = lead.slaDeadline && new Date() <= lead.slaDeadline ? 'met' : 'breached';
        }

        await Lead.findByIdAndUpdate(leadId, updates);
      }
    } else if (to) {
      // Try to find lead by phone number and update SLA
      let phone = to.replace(/\D/g, '');
      if (phone.startsWith('972')) {
        phone = '0' + phone.substring(3);
      }

      const lead = await Lead.findOne({ phone });
      if (lead && !lead.firstResponseAt && lead.slaStatus === 'pending') {
        await Lead.findByIdAndUpdate(lead._id, {
          lastContactAt: new Date(),
          firstResponseAt: new Date(),
          slaStatus: lead.slaDeadline && new Date() <= lead.slaDeadline ? 'met' : 'breached',
        });
      }
    }

    // Find or create conversation and add interaction
    let conversation = await Conversation.findOne({
      tenantId: user.tenantId,
      $or: [
        { contactPhone: to },
        { leadId: leadId },
      ],
    });

    if (!conversation && leadId) {
      const lead = await Lead.findById(leadId);
      conversation = await Conversation.create({
        tenantId: user.tenantId,
        leadId: leadId,
        contactName: lead?.name,
        contactPhone: lead?.phone || to,
        channel: 'whatsapp',
        status: 'open',
        interactions: [],
      });
    }

    if (conversation) {
      conversation.interactions.push({
        type: 'message',
        direction: 'outbound',
        channel: 'whatsapp',
        content: message,
        createdBy: user._id,
        createdAt: new Date(),
        metadata: {
          messageId: result.messageId,
          provider: result.provider,
        },
      });
      conversation.lastMessageAt = new Date();
      await conversation.save();
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      to: result.to,
      provider: result.provider,
    });
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    return NextResponse.json({
      error: error.message || 'Failed to send message',
    }, { status: 500 });
  }
}

async function GETHandler(request) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (WHATSAPP_PROVIDER === '360dialog') {
      return NextResponse.json({
        configured: !!DIALOG_360_API_KEY,
        provider: '360dialog',
        ready: !!DIALOG_360_API_KEY,
      });
    } else if (WHATSAPP_PROVIDER === 'local') {
      try {
        const res = await fetch(`${WHATSAPP_SERVER_URL}/status`);
        const data = await res.json();
        return NextResponse.json({ configured: data.ready, provider: 'baileys', ready: data.ready });
      } catch {
        return NextResponse.json({ configured: false, provider: 'baileys', ready: false });
      }
    } else {
      return NextResponse.json({ configured: true, provider: 'mock', ready: true, mock: true });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
export const GET = withErrorLogging(GETHandler);
