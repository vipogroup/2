import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import Conversation from '@/models/Conversation';
import { requireAuthApi } from '@/lib/auth/server';
import { resolveTenantId } from '@/lib/tenant/tenantMiddleware';

// GET /api/crm/conversations - List conversations (Inbox)
async function GETHandler(request) {
  try {
    const user = await requireAuthApi(request);
    await connectMongo();
    const tenantId = await resolveTenantId(user, request);
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const channel = searchParams.get('channel');
    const assignedTo = searchParams.get('assignedTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build query
    const query = { tenantId };
    if (status) query.status = status;
    if (channel) query.channel = channel;
    if (assignedTo) query.assignedTo = assignedTo;

    const [conversations, total] = await Promise.all([
      Conversation.find(query)
        .populate('assignedTo', 'fullName email')
        .populate('leadId', 'name phone')
        .populate('customerId', 'fullName phone')
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(query),
    ]);

    // Get status counts
    const statusCounts = await Conversation.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return NextResponse.json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      statusCounts: statusCounts.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST /api/crm/conversations - Create conversation
async function POSTHandler(request) {
  try {
    const user = await requireAuthApi(request);
    await connectMongo();
    const tenantId = await resolveTenantId(user, request);
    const body = await request.json();

    const conversation = await Conversation.create({
      ...body,
      tenantId,
      assignedTo: body.assignedTo || user._id,
      lastMessageAt: new Date(),
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
