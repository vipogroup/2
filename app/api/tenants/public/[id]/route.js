import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

const BLOCKED = new Set(['inactive', 'suspended', 'disabled', 'archived']);

/**
 * GET /api/tenants/public/[id] — תצוגה ציבורית מינימלית (שם, slug, לוגו) לפי מזהה עסק.
 * לשימוש בדף מוצר כשיש tenantId בלי אובייקט tenant מלא.
 */
async function GETHandler(req, { params }) {
  try {
    const rawId = params?.id;
    if (!rawId || !ObjectId.isValid(String(rawId))) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'service_unavailable' }, { status: 503 });
    }

    const tenant = await db.collection('tenants').findOne(
      { _id: new ObjectId(String(rawId)) },
      { projection: { name: 1, slug: 1, status: 1, branding: 1 } },
    );

    if (!tenant?.slug) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const status = String(tenant.status || '').toLowerCase();
    if (BLOCKED.has(status)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({
      tenant: {
        _id: String(tenant._id),
        name: tenant.name || 'חנות',
        slug: tenant.slug,
        logo: tenant.branding?.logo || null,
        primaryColor: tenant.branding?.primaryColor || null,
      },
    });
  } catch (error) {
    console.error('GET /api/tenants/public/[id] error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
