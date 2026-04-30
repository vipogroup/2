import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import Conversation from '@/models/Conversation';
import { requireAuthApi } from '@/lib/auth/server';
import { resolveTenantId } from '@/lib/tenant/tenantMiddleware';

// GET /api/crm/conversations/[id] - Get single conversation
async function GETHandler(request, { params }) {
  try {
    const user = await requireAuthApi(request);
    await connectMongo();
    const tenantId = await resolveTenantId(user, request);
    const { id } = await params;

    const conversation = await Conversation.findOne({ _id: id, tenantId })
      .populate('assignedTo', 'fullName email phone')
      .populate('leadId', 'name phone email status')
      .populate('customerId', 'fullName phone email')
      .populate('interactions.createdBy', 'fullName')
      .lean();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

// PATCH /api/crm/conversations/[id] - Update conversation
async function PATCHHandler(request, { params }) {
  try {
    const user = await requireAuthApi(request);
    await connectMongo();
    const tenantId = await resolveTenantId(user, request);
    const { id } = await params;
    const body = await request.json();

    const conversation = await Conversation.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: body },
      { new: true }
    ).populate('assignedTo', 'fullName email');

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const PATCH = withErrorLogging(PATCHHandler);
