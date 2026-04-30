import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

async function GETHandler(req, { params }) {
  try {
    const { slug } = params;
    
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const db = await getDb();
    const tenant = await db.collection('tenants').findOne({
      slug: slug.toLowerCase(),
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      tenant: {
        _id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        description: tenant.description,
        domain: tenant.domain,
        subdomain: tenant.subdomain,
        status: tenant.status,
        branding: tenant.branding,
        contact: tenant.contact,
      },
    });
  } catch (error) {
    console.error('GET /api/tenants/by-slug/[slug] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
