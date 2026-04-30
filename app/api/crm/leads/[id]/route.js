import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import Lead from '@/models/Lead';
import User from '@/models/User';
import { requireAuthApi } from '@/lib/auth/server';
import { resolveTenantId } from '@/lib/tenant/tenantMiddleware';

// GET /api/crm/leads/[id] - Get single lead
async function GETHandler(request, { params }) {
  try {
    const user = await requireAuthApi(request);
    await connectMongo();
    const tenantId = await resolveTenantId(user, request);
    const { id } = await params;

    const lead = await Lead.findOne({ _id: id, tenantId })
      .populate('assignedTo', 'fullName email phone')
      .populate('agentId', 'fullName')
      .populate('customerId', 'fullName email phone')
      .lean();

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 });
  }
}

// PATCH /api/crm/leads/[id] - Update lead
async function PATCHHandler(request, { params }) {
  try {
    const user = await requireAuthApi(request);
    await connectMongo();
    const tenantId = await resolveTenantId(user, request);
    const { id } = await params;
    const body = await request.json();

    const lead = await Lead.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: body },
      { new: true }
    ).populate('assignedTo', 'fullName email');

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

// DELETE /api/crm/leads/[id] - Delete lead
async function DELETEHandler(request, { params }) {
  try {
    const user = await requireAuthApi(request);
    await connectMongo();
    const tenantId = await resolveTenantId(user, request);
    const { id } = await params;

    const lead = await Lead.findOneAndDelete({ _id: id, tenantId });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const PATCH = withErrorLogging(PATCHHandler);
export const DELETE = withErrorLogging(DELETEHandler);
