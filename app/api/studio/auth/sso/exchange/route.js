import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';
import { sign as signJwt } from '@/lib/auth/createToken';
import { apiDebugLog } from '@/lib/apiDebugLog';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization,content-type',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function failure(message, status = 400, extra = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status, headers: CORS_HEADERS });
}

async function POSTHandler(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (!code) return failure('Missing code', 400);

    // The 'code' is a signed JWT containing userId, role, tenantId, baseUrl
    const ssoSecret = String(process.env.STUDIO_SSO_SECRET || process.env.JWT_SECRET || 'dev-studio-sso-secret');
    let ssoPayload;
    try {
      ssoPayload = jwt.verify(code, ssoSecret);
    } catch (e) {
      apiDebugLog('[sso/exchange] JWT verify failed:', e?.message);
      return failure('Invalid or expired code', 401);
    }

    apiDebugLog('[sso/exchange] ssoPayload:', JSON.stringify(ssoPayload));

    const userId = ssoPayload?.userId;
    if (!userId || !ObjectId.isValid(userId)) {
      return failure('Invalid code payload', 401);
    }

    const db = await getDb();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { _id: 1, role: 1, email: 1, fullName: 1, tenantId: 1, isActive: 1 } },
    );

    if (!user || user.isActive === false) {
      return failure('Forbidden', 403);
    }

    const role = user.role || ssoPayload.role || 'customer';
    if (role !== 'admin' && role !== 'super_admin' && role !== 'business_admin') {
      return failure('Forbidden', 403);
    }

    const tenantId = user.tenantId ? String(user.tenantId) : ssoPayload.tenantId || null;

    const jwtPayload = {
      userId: String(user._id),
      role,
      email: user.email || null,
      ...(tenantId ? { tenantId } : {}),
    };

    const token = signJwt(jwtPayload, { expiresIn: '2h' });

    return NextResponse.json(
      {
        ok: true,
        token,
        baseUrl: ssoPayload.baseUrl || null,
        user: {
          _id: user._id?.toString?.() ?? String(user._id),
          role,
          email: user.email || null,
          fullName: user.fullName || null,
          tenantId,
        },
      },
      { headers: CORS_HEADERS },
    );
  } catch (err) {
    console.error('POST /api/studio/auth/sso/exchange error:', err);
    return failure('Server error', 500);
  }
}

export const POST = withErrorLogging(POSTHandler);
