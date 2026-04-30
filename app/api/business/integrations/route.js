export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireAuthApi } from '@/lib/auth/server';

/**
 * GET /api/business/integrations
 * Get integration settings for business admin's tenant
 */
export async function GET(req) {
  try {
    const user = await requireAuthApi(req);
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Must be business_admin with tenantId
    if (!['business_admin', 'admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const db = await getDb();
    const tenant = await db.collection('tenants').findOne(
      { _id: new ObjectId(user.tenantId) },
      {
        projection: {
          paymentMode: 1,
          domain: 1,
          subdomain: 1,
          payplus: 1,
          priority: 1,
        }
      }
    );

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Mask sensitive data
    const maskedTenant = {
      ...tenant,
      payplus: tenant.payplus ? {
        ...tenant.payplus,
        apiKey: tenant.payplus.apiKey ? '••••••' + tenant.payplus.apiKey.slice(-4) : '',
        secretKey: tenant.payplus.secretKey ? '••••••••' : '',
        webhookSecret: tenant.payplus.webhookSecret ? '••••••••' : '',
      } : {},
      priority: tenant.priority ? {
        ...tenant.priority,
        password: tenant.priority.password ? '••••••••' : '',
      } : {},
    };

    return NextResponse.json({ ok: true, tenant: maskedTenant });
  } catch (err) {
    console.error('BUSINESS_INTEGRATIONS_GET_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * PUT /api/business/integrations
 * Update integration settings for business admin's tenant
 */
export async function PUT(req) {
  try {
    const user = await requireAuthApi(req);
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Must be business_admin with tenantId
    if (!['business_admin', 'admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const body = await req.json();
    const { paymentMode, domain, subdomain, payplus, priority } = body;

    const db = await getDb();
    const tenantId = new ObjectId(user.tenantId);

    // Get current tenant to preserve non-masked values
    const currentTenant = await db.collection('tenants').findOne({ _id: tenantId });
    if (!currentTenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Build update object
    const updateFields = {
      updatedAt: new Date(),
    };

    // Payment Mode update
    if (paymentMode && ['platform', 'independent'].includes(paymentMode)) {
      updateFields.paymentMode = paymentMode;
    }

    // Domain updates (only if changed and not empty)
    if (domain !== undefined) {
      if (domain && domain !== currentTenant.domain) {
        // Check if domain is already taken
        const existingDomain = await db.collection('tenants').findOne({
          domain: domain.toLowerCase(),
          _id: { $ne: tenantId }
        });
        if (existingDomain) {
          return NextResponse.json({ error: 'דומיין זה כבר בשימוש' }, { status: 400 });
        }
        updateFields.domain = domain.toLowerCase();
      } else if (!domain) {
        updateFields.domain = null;
      }
    }

    if (subdomain !== undefined) {
      if (subdomain && subdomain !== currentTenant.subdomain) {
        // Check if subdomain is already taken
        const existingSubdomain = await db.collection('tenants').findOne({
          subdomain: subdomain.toLowerCase(),
          _id: { $ne: tenantId }
        });
        if (existingSubdomain) {
          return NextResponse.json({ error: 'תת-דומיין זה כבר בשימוש' }, { status: 400 });
        }
        updateFields.subdomain = subdomain.toLowerCase();
      } else if (!subdomain) {
        updateFields.subdomain = null;
      }
    }

    // PayPlus updates
    if (payplus) {
      const currentPayplus = currentTenant.payplus || {};
      updateFields.payplus = {
        enabled: payplus.enabled || false,
        apiKey: payplus.apiKey?.includes('••••') ? currentPayplus.apiKey : (payplus.apiKey || null),
        secretKey: payplus.secretKey?.includes('••••') ? currentPayplus.secretKey : (payplus.secretKey || null),
        terminalId: payplus.terminalId || null,
        webhookSecret: payplus.webhookSecret?.includes('••••') ? currentPayplus.webhookSecret : (payplus.webhookSecret || null),
        testMode: payplus.testMode !== false,
      };
    }

    // Priority updates
    if (priority) {
      const currentPriority = currentTenant.priority || {};
      updateFields.priority = {
        enabled: priority.enabled || false,
        apiUrl: priority.apiUrl || null,
        username: priority.username || null,
        password: priority.password?.includes('••••') ? currentPriority.password : (priority.password || null),
        companyId: priority.companyId || null,
        priceListCode: priority.priceListCode || null,
        warehouseCode: priority.warehouseCode || null,
      };
    }

    await db.collection('tenants').updateOne(
      { _id: tenantId },
      { $set: updateFields }
    );

    return NextResponse.json({ ok: true, message: 'Settings updated successfully' });
  } catch (err) {
    console.error('BUSINESS_INTEGRATIONS_PUT_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
