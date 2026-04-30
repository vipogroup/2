import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import Conversation from '@/models/Conversation';
import { requireAuthApi } from '@/lib/auth/server';
import { resolveTenantId } from '@/lib/tenant/tenantMiddleware';

// POST /api/crm/conversations/[id]/interactions - Add interaction
async function POSTHandler(request, { params }) {
  try {
    const user = await requireAuthApi(request);
    await connectMongo();
    const tenantId = await resolveTenantId(user, request);
    const { id } = await params;
    const body = await request.json();

    const conversation = await Conversation.findOne({ _id: id, tenantId });
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Add interaction
    const interaction = {
      type: body.type || 'message',
      direction: body.direction || 'outbound',
      content: body.content,
      createdBy: user._id,
      metadata: body.metadata,
      createdAt: new Date(),
    };

    conversation.interactions.push(interaction);
    conversation.lastMessageAt = new Date();
    
    // Update status if needed
    if (conversation.status === 'new') {
      conversation.status = 'open';
    }

    await conversation.save();

    return NextResponse.json({
      success: true,
      interaction: conversation.interactions[conversation.interactions.length - 1],
    });
  } catch (error) {
    console.error('Error adding interaction:', error);
    return NextResponse.json({ error: 'Failed to add interaction' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
