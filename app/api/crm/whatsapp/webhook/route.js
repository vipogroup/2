import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import Conversation from '@/models/Conversation';
import { apiDebugLog } from '@/lib/apiDebugLog';

export const dynamic = 'force-dynamic';

// Store messages in memory for display
let recentMessages = [];
// Idempotency - track processed message IDs
const processedMessageIds = new Set();

function getRecentMessages() {
  return recentMessages;
}

// SLA Configuration (in hours)
const SLA_FIRST_RESPONSE_HOURS = 2;

/**
 * Parse incoming webhook data from different providers
 * 360dialog format: { messages: [{ from, id, timestamp, type, text: { body } }], contacts: [{ profile: { name }, wa_id }] }
 * Baileys/internal format: { from, message, timestamp, id }
 */
function parseWebhookData(data) {
  // 360dialog / WhatsApp Cloud API format
  if (data.messages && Array.isArray(data.messages)) {
    return data.messages
      .filter(m => m.type === 'text' && m.text?.body)
      .map(m => {
        const contact = data.contacts?.find(c => c.wa_id === m.from);
        return {
          from: m.from,
          message: m.text.body,
          timestamp: m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : new Date().toISOString(),
          id: m.id,
          contactName: contact?.profile?.name || null,
          provider: '360dialog',
        };
      });
  }

  // Baileys / internal format
  if (data.from && data.message) {
    return [{
      from: data.from,
      message: data.message,
      timestamp: data.timestamp || new Date().toISOString(),
      id: data.id || `internal_${Date.now()}`,
      contactName: data.contactName || null,
      provider: 'internal',
    }];
  }

  return [];
}

/**
 * Process a single incoming message - create/update Lead + Conversation in CRM
 */
async function processIncomingMessage({ from, message, timestamp, id, contactName }) {
  // Normalize phone number
  let phone = from.replace(/\D/g, '');
  if (phone.startsWith('972')) {
    phone = '0' + phone.substring(3);
  }

  apiDebugLog(`[WEBHOOK] Incoming from ${phone}: ${message}`);

  // Find or create Lead
  let lead = await Lead.findOne({ phone });

  if (!lead) {
    const slaDeadline = new Date(Date.now() + SLA_FIRST_RESPONSE_HOURS * 60 * 60 * 1000);
    lead = await Lead.create({
      name: contactName || `WhatsApp - ${phone}`,
      phone,
      source: 'whatsapp',
      status: 'new',
      segment: 'warm',
      score: 40,
      notes: `First message: ${message}`,
      tags: ['whatsapp'],
      lastContactAt: new Date(),
      slaDeadline,
      slaStatus: 'pending',
      priority: 'normal',
    });
    apiDebugLog(`[WEBHOOK] Created new lead: ${lead._id}`);
  } else {
    if (contactName && lead.name.startsWith('WhatsApp -')) {
      lead.name = contactName;
    }
    lead.lastContactAt = new Date();
    await lead.save();
  }

  // Find or create Conversation
  let conversation = await Conversation.findOne({
    leadId: lead._id,
    channel: 'whatsapp',
    status: { $nin: ['closed', 'spam'] },
  });

  const interaction = {
    type: 'whatsapp',
    direction: 'inbound',
    content: message,
    metadata: new Map([
      ['externalId', id],
      ['phone', phone],
    ]),
    createdAt: timestamp ? new Date(timestamp) : new Date(),
    updatedAt: new Date(),
  };

  if (!conversation) {
    conversation = await Conversation.create({
      leadId: lead._id,
      contactName: contactName || lead.name,
      contactPhone: phone,
      channel: 'whatsapp',
      status: 'new',
      subject: contactName || phone,
      interactions: [interaction],
      lastMessageAt: new Date(),
      priority: 'normal',
    });
    apiDebugLog(`[WEBHOOK] Created conversation: ${conversation._id}`);
  } else {
    conversation.interactions.push(interaction);
    conversation.lastMessageAt = new Date();
    if (conversation.status === 'resolved') conversation.status = 'open';
    await conversation.save();
  }

  return { leadId: lead._id, conversationId: conversation._id, isNew: !lead.updatedAt || lead.createdAt.getTime() === lead.updatedAt.getTime() };
}

/**
 * GET - webhook verification for 360dialog / WhatsApp Cloud API
 */
async function GETHandler(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'vipo-whatsapp-verify';

  if (mode === 'subscribe' && token === verifyToken) {
    apiDebugLog('[WEBHOOK] Verification successful');
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  // Return recent messages if not a verification request
  return NextResponse.json({ messages: recentMessages.slice(0, 20) });
}

/**
 * POST - receive incoming messages from 360dialog or internal server
 */
async function POSTHandler(request) {
  try {
    const rawData = await request.json();

    // Parse messages from any provider format
    const parsedMessages = parseWebhookData(rawData);

    if (parsedMessages.length === 0) {
      // 360dialog sends status updates too - acknowledge them
      return NextResponse.json({ success: true, note: 'no_text_messages' });
    }

    const results = [];

    for (const msg of parsedMessages) {
      // Idempotency check
      if (msg.id && processedMessageIds.has(msg.id)) {
        apiDebugLog('[WEBHOOK] Skipping duplicate:', msg.id);
        results.push({ id: msg.id, duplicate: true });
        continue;
      }

      if (msg.id) {
        processedMessageIds.add(msg.id);
        if (processedMessageIds.size > 1000) {
          const firstId = processedMessageIds.values().next().value;
          processedMessageIds.delete(firstId);
        }
      }

      // Save to memory
      recentMessages.unshift({ ...msg, type: 'incoming', receivedAt: new Date().toISOString() });
      if (recentMessages.length > 50) recentMessages.pop();

      // Process in CRM
      await dbConnect();
      const result = await processIncomingMessage(msg);
      results.push({ id: msg.id, ...result });
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error) {
    console.error('[WEBHOOK] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
