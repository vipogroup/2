import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import Lead from '@/models/Lead';
import User from '@/models/User';
import { requireAuthApi } from '@/lib/auth/server';
import { resolveTenantId } from '@/lib/tenant/tenantMiddleware';

// POST /api/crm/leads/[id]/convert - Convert lead to customer
async function POSTHandler(request, { params }) {
  try {
    const user = await requireAuthApi(request);
    await connectMongo();
    const tenantId = await resolveTenantId(user, request);
    const { id } = await params;

    const lead = await Lead.findOne({ _id: id, tenantId });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.convertedToCustomer) {
      return NextResponse.json({ error: 'Lead already converted' }, { status: 400 });
    }

    // Check if customer with same phone/email exists
    let customer = await User.findOne({
      tenantId,
      $or: [
        { phone: lead.phone },
        ...(lead.email ? [{ email: lead.email }] : []),
      ],
    });

    if (!customer) {
      // Create new customer
      customer = await User.create({
        tenantId,
        fullName: lead.name,
        phone: lead.phone,
        email: lead.email || undefined,
        role: 'customer',
        referredBy: lead.agentId,
        isActive: true,
      });
    }

    // Update lead
    lead.convertedToCustomer = true;
    lead.customerId = customer._id;
    lead.convertedAt = new Date();
    lead.status = 'converted';
    await lead.save();

    return NextResponse.json({
      success: true,
      lead,
      customer,
    });
  } catch (error) {
    console.error('Error converting lead:', error);
    return NextResponse.json({ error: 'Failed to convert lead' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
