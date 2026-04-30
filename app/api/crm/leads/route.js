import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import Lead from '@/models/Lead';
import { requireAuthApi } from '@/lib/auth/server';
import { resolveTenantId } from '@/lib/tenant/tenantMiddleware';

// GET /api/crm/leads - List leads
async function GETHandler(request) {
  try {
    const user = await requireAuthApi(request);
    await connectMongo();
    const tenantId = await resolveTenantId(user, request);
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build query
    const query = { tenantId };
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate('assignedTo', 'fullName email')
        .populate('agentId', 'fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(query),
    ]);

    // Get status counts
    const statusCounts = await Lead.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return NextResponse.json({
      leads,
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
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

// POST /api/crm/leads - Create lead
async function POSTHandler(request) {
  try {
    const user = await requireAuthApi(request);
    await connectMongo();
    const tenantId = await resolveTenantId(user, request);
    const body = await request.json();

    const lead = await Lead.create({
      ...body,
      tenantId,
      assignedTo: body.assignedTo || user._id,
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
