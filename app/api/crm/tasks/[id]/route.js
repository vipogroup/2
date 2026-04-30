import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import CrmTask from '@/models/CrmTask';
import { requireAuthApi } from '@/lib/auth/server';
import { resolveTenantId } from '@/lib/tenant/tenantMiddleware';

// GET /api/crm/tasks/[id] - Get single task
async function GETHandler(request, { params }) {
  try {
    const user = await requireAuthApi(request);
    await connectMongo();
    const tenantId = await resolveTenantId(user, request);
    const { id } = await params;

    const task = await CrmTask.findOne({ _id: id, tenantId })
      .populate('assignedTo', 'fullName email phone')
      .populate('createdBy', 'fullName')
      .populate('leadId', 'name phone email')
      .populate('customerId', 'fullName phone email')
      .lean();

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

// PATCH /api/crm/tasks/[id] - Update task
async function PATCHHandler(request, { params }) {
  try {
    const user = await requireAuthApi(request);
    await connectMongo();
    const tenantId = await resolveTenantId(user, request);
    const { id } = await params;
    const body = await request.json();

    // Handle completion
    if (body.status === 'completed' && !body.completedAt) {
      body.completedAt = new Date();
      body.completedBy = user._id;
    }

    const task = await CrmTask.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: body },
      { new: true }
    ).populate('assignedTo', 'fullName email');

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE /api/crm/tasks/[id] - Delete task
async function DELETEHandler(request, { params }) {
  try {
    const user = await requireAuthApi(request);
    await connectMongo();
    const tenantId = await resolveTenantId(user, request);
    const { id } = await params;

    const task = await CrmTask.findOneAndDelete({ _id: id, tenantId });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const PATCH = withErrorLogging(PATCHHandler);
export const DELETE = withErrorLogging(DELETEHandler);
