import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/dbConnect';
import MessageTemplate from '@/models/MessageTemplate';
import { requireAuth } from '@/lib/auth/requireAuth';
import { getTenantFilter } from '@/lib/tenantContext';

async function GETHandler(request) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const channel = searchParams.get('channel');
    
    const filter = getTenantFilter(user);
    filter.isActive = true;
    
    if (category) filter.category = category;
    if (channel) filter.channel = { $in: [channel, 'all'] };

    const templates = await MessageTemplate.find(filter)
      .sort({ usageCount: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
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
    
    // Extract variables from content
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables = [];
    let match;
    while ((match = variableRegex.exec(body.content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    const template = await MessageTemplate.create({
      ...body,
      tenantId: user.tenantId,
      createdBy: user._id,
      variables,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
