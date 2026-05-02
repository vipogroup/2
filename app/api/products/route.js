import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDB } from '@/lib/mongoose';
import Product from '@/models/Product';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth/requireAuth';
import { isSuperAdminUser } from '@/lib/superAdmins';
import { assertTenantAccessOrThrow } from '@/lib/products/productListScope';

export const dynamic = 'force-dynamic';

async function loadUserForProductList(req) {
  const auth = await requireAuth(req);
  if (!auth?._id) return null;
  try {
    const oid = new ObjectId(String(auth._id));
    const db = await getDb();
    const row = await db.collection('users').findOne(
      { _id: oid },
      { projection: { email: 1, role: 1, tenantId: 1, isActive: 1 } },
    );
    if (!row || row.isActive === false) return null;
    return {
      _id: row._id,
      id: String(row._id),
      email: row.email || '',
      role: row.role || auth.role || 'customer',
      tenantId: row.tenantId != null ? String(row.tenantId) : null,
    };
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    await connectToDB();
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get('tenantId')?.trim() || '';
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const featured = searchParams.get('featured') === 'true';
    const marketplace = searchParams.get('marketplace') === 'true';
    const activeOnly = searchParams.get('active') === '1' || searchParams.get('active') === 'true';
    const limitRaw = parseInt(String(searchParams.get('limit') || ''), 10);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 5000) : 0;

    const user = await loadUserForProductList(request);

    const andParts = [];

    if (tenantIdParam) {
      assertTenantAccessOrThrow(user, tenantIdParam);
      andParts.push({ tenantId: tenantIdParam });
    } else if (user?.role === 'business_admin' && user.tenantId) {
      andParts.push({ tenantId: user.tenantId });
    } else if (user && !isSuperAdminUser(user) && user.role === 'admin' && user.tenantId) {
      andParts.push({ tenantId: user.tenantId });
    }

    if (andParts.length && !includeInactive) {
      andParts.push({
        $or: [{ status: { $exists: false } }, { status: { $nin: ['inactive', 'archived'] } }],
      });
    }

    if (featured) {
      andParts.push({ isFeatured: true });
    }
    if (marketplace) {
      andParts.push({ status: 'published' });
    }
    if (activeOnly && !marketplace) {
      andParts.push({ inStock: true });
    }

    let finalQuery = {};
    if (andParts.length === 1) {
      finalQuery = andParts[0];
    } else if (andParts.length > 1) {
      finalQuery = { $and: andParts };
    }

    let cursor = Product.find(finalQuery).lean();
    if (limit > 0) {
      cursor = cursor.limit(limit);
    }

    const products = await cursor;
    return NextResponse.json(products, { status: 200 });
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('GET /api/products error:', err);
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }
}
