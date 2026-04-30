import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/dbConnect';
import Automation from '@/models/Automation';
import { requireAuth } from '@/lib/auth/requireAuth';
import { getTenantFilter } from '@/lib/tenantContext';

async function GETHandler(request) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const filter = getTenantFilter(user);

    const automations = await Automation.find(filter)
      .populate('action.templateId', 'name')
      .populate('action.assignTo', 'fullName')
      .populate('createdBy', 'fullName')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ automations });
  } catch (error) {
    console.error('Error fetching automations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function POSTHandler(request) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const body = await request.json();

    const automation = await Automation.create({
      ...body,
      tenantId: user.tenantId,
      createdBy: user._id,
    });

    return NextResponse.json({ automation }, { status: 201 });
  } catch (error) {
    console.error('Error creating automation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
