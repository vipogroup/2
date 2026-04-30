import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth/hash';
import { verify as verifyJwt } from '@/lib/auth/createToken';
import { generateAgentCoupon } from '@/lib/agents';
import { getCurrentTenant } from '@/lib/tenant';

function getToken(req) {
  return req.cookies.get('auth_token')?.value || req.cookies.get('token')?.value || '';
}

function ensureAdmin(req) {
  const decoded = verifyJwt(getToken(req));
  if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'super_admin' && decoded.role !== 'business_admin')) {
    return null;
  }
  return decoded;
}

function normalizeId(doc) {
  if (!doc) return doc;
  return {
    ...doc,
    _id: doc._id ? String(doc._id) : undefined,
  };
}

function sortAndSlice(items, skip, limit) {
  const sorted = [...items].sort((a, b) => {
    const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
  return sorted.slice(skip, skip + limit);
}

async function GETHandler(req) {
  try {
    const admin = ensureAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const db = await getDb();
    const col = db.collection('users');
    const projection = { passwordHash: 0, password: 0 };
    
    // Multi-Tenant: Filter by tenant
    const tenant = await getCurrentTenant(req);
    const filter = { role: 'agent' };
    if (tenant) {
      filter.tenantId = tenant._id;
    } else if (admin.tenantId) {
      // Business admin - filter by their tenant
      const { ObjectId } = await import('mongodb');
      filter.tenantId = new ObjectId(admin.tenantId);
    }
    
    const cursor = await col.find(filter, { projection });

    let agents;
    let total;

    if (typeof cursor.sort === 'function') {
      agents = await cursor.sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();
      total = await col.countDocuments(filter);
    } else {
      const all = await cursor.toArray();
      total = all.length;
      agents = sortAndSlice(all, skip, limit);
    }

    return NextResponse.json({
      agents: agents.map(normalizeId),
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error('AGENTS_GET_ERROR', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

async function POSTHandler(req) {
  try {
    const admin = ensureAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fullName, email, phone, password } = body || {};

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = await getDb();
    const col = db.collection('users');

    const existing = await col.findOne({
      $or: [{ email: normalizedEmail }, ...(phone ? [{ phone }] : [])],
    });

    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    // Multi-Tenant: Get tenant from request or admin
    const tenant = await getCurrentTenant(req);
    let tenantId = null;
    if (tenant) {
      tenantId = tenant._id;
    } else if (admin.tenantId) {
      const { ObjectId } = await import('mongodb');
      tenantId = new ObjectId(admin.tenantId);
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();
    const doc = {
      fullName,
      email: normalizedEmail,
      phone: phone || null,
      role: 'agent',
      passwordHash,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      // Multi-Tenant: Associate agent with tenant
      ...(tenantId && { tenantId }),
    };

    const insertResult = await col.insertOne(doc);
    const createdId = insertResult.insertedId || doc._id;

    if (createdId) {
      try {
        const couponResult = await generateAgentCoupon({ fullName, agentId: createdId });
        // Also update directly via MongoDB to ensure sync
        if (couponResult?.couponCode) {
          await col.updateOne(
            { _id: createdId },
            { 
              $set: { 
                couponCode: couponResult.couponCode,
                couponSlug: couponResult.couponSlug,
                couponSequence: couponResult.couponSequence,
                couponStatus: 'active',
                discountPercent: 10,
                commissionPercent: 12
              } 
            }
          );
        }
      } catch (couponError) {
        console.error('AGENT_COUPON_GENERATION_ERROR', couponError);
      }
    }

    const created = await col.findOne(createdId ? { _id: createdId } : { email: normalizedEmail }, {
      projection: { passwordHash: 0, password: 0 },
    });

    return NextResponse.json({ success: true, agent: normalizeId(created) }, { status: 201 });
  } catch (err) {
    console.error('AGENTS_POST_ERROR', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
