import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import CrmTask from '@/models/CrmTask';
import { requireAuthApi } from '@/lib/auth/server';
import { resolveTenantId } from '@/lib/tenant/tenantMiddleware';

// GET /api/crm/tasks - List tasks
async function GETHandler(request) {
  try {
    const user = await requireAuthApi(request);
    await connectMongo();
    const tenantId = await resolveTenantId(user, request);
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');
    const myTasks = searchParams.get('myTasks') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build query
    const query = { tenantId };
    if (status) query.status = status;
    if (myTasks) {
      query.assignedTo = user._id;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    const [tasks, total] = await Promise.all([
      CrmTask.find(query)
        .populate('assignedTo', 'fullName email')
        .populate('createdBy', 'fullName')
        .populate('leadId', 'name phone')
        .populate('customerId', 'fullName phone')
        .sort({ dueAt: 1, priority: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CrmTask.countDocuments(query),
    ]);

    // Get status counts
    const statusCounts = await CrmTask.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Get overdue count
    const overdueCount = await CrmTask.countDocuments({
      tenantId,
      status: 'pending',
      dueAt: { $lt: new Date() },
    });

    return NextResponse.json({
      tasks,
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
      overdueCount,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/crm/tasks - Create task
async function POSTHandler(request) {
  try {
    const user = await requireAuthApi(request);
    await connectMongo();
    const tenantId = await resolveTenantId(user, request);
    const body = await request.json();

    const task = await CrmTask.create({
      ...body,
      tenantId,
      createdBy: user._id,
      assignedTo: body.assignedTo || user._id,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
