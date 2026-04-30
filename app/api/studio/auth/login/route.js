import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { rateLimiters } from '@/lib/rateLimit';
import { sign as signJwt } from '@/lib/auth/createToken';
import { logSecurityEvent } from '@/lib/securityEvents';
import { isPrimaryAdminEmail, isPrimaryAdminPassword, primaryAdminConfig } from '@/lib/auth/primaryAdminConfig';

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

function normalizePhone(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;

  const digitsOnly = str.replace(/\D/g, '');
  if (!digitsOnly) return null;

  if (str.startsWith('+')) {
    return `+${digitsOnly}`;
  }

  return digitsOnly;
}

async function POSTHandler(req) {
  const rateLimit = rateLimiters.login(req);
  if (!rateLimit.allowed) {
    return failure(rateLimit.message || 'Too many requests', 429, { errorCode: 'TOO_MANY_REQUESTS' });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const identifier = body?.email || body?.identifier;
    const password = body?.password;
    const rememberMe = Boolean(body?.rememberMe);

    if (!identifier || !password) {
      return failure('Missing identifier or password', 400);
    }

    const normalizedEmail = typeof identifier === 'string' ? identifier.trim().toLowerCase() : '';
    const normalizedPhone = normalizePhone(identifier);
    const normalizedPassword = typeof password === 'string' ? password : '';

    if ((!normalizedEmail && !normalizedPhone) || !normalizedPassword) {
      return failure('Missing identifier or password', 400);
    }

    const db = await getDb();
    const users = db.collection('users');

    const query = [];
    if (normalizedEmail) query.push({ email: normalizedEmail });
    if (normalizedPhone) query.push({ phone: normalizedPhone });

    const isPrimaryAdminLoginAttempt = isPrimaryAdminEmail(normalizedEmail);
    const isPrimaryAdminPasswordAttempt = isPrimaryAdminPassword(normalizedPassword);

    let user = await users.findOne(
      { $or: query.length ? query : [{ email: normalizedEmail }] },
      {
        projection: {
          _id: 1,
          passwordHash: 1,
          role: 1,
          fullName: 1,
          email: 1,
          phone: 1,
          tenantId: 1,
          isActive: 1,
        },
      },
    );

    // Bootstrap/repair primary admin when using configured credentials (matches /api/auth/login behavior)
    if (isPrimaryAdminLoginAttempt && isPrimaryAdminPasswordAttempt && !user?.passwordHash) {
      const now = new Date();
      const passwordHash = await bcrypt.hash(normalizedPassword, 10);
      const projectionFields = {
        _id: 1,
        passwordHash: 1,
        role: 1,
        fullName: 1,
        email: 1,
        phone: 1,
        tenantId: 1,
        isActive: 1,
      };

      const upserted = await users.findOneAndUpdate(
        {
          $or: [
            { email: primaryAdminConfig.canonicalEmail },
            { email: primaryAdminConfig.legacyEmail },
            ...primaryAdminConfig.phoneCandidates.map((phone) => ({ phone })),
          ],
        },
        {
          $set: {
            email: primaryAdminConfig.canonicalEmail,
            phone: primaryAdminConfig.canonicalPhone,
            role: 'admin',
            tenantId: null,
            isSuperAdmin: true,
            protected: true,
            isActive: true,
            passwordHash,
            updatedAt: now,
          },
          $setOnInsert: {
            fullName: 'מנהל ראשי',
            createdAt: now,
          },
        },
        { projection: projectionFields, returnDocument: 'after', upsert: true },
      );

      user = upserted?.value || user;
    }

    if (!user?.passwordHash) {
      await logSecurityEvent({
        action: 'studio_login_fail',
        message: 'Studio login failed: invalid credentials',
        severity: 'medium',
        req,
        identifier: normalizedEmail || normalizedPhone || identifier,
        details: { statusCode: 401, reason: 'invalid_credentials' },
      });
      return failure('Invalid credentials', 401);
    }

    if (user?.isActive === false) {
      await logSecurityEvent({
        action: 'studio_login_blocked',
        message: 'Studio login blocked: inactive user',
        severity: 'high',
        req,
        user: { _id: user._id?.toString?.() ?? String(user._id), email: user.email, role: user.role, tenantId: user.tenantId },
        identifier: normalizedEmail || normalizedPhone || identifier,
        details: { statusCode: 403, reason: 'inactive_user' },
      });
      return failure('Forbidden', 403);
    }

    const passwordMatches = await bcrypt.compare(normalizedPassword, user.passwordHash);
    if (!passwordMatches) {
      await logSecurityEvent({
        action: 'studio_login_fail',
        message: 'Studio login failed: invalid credentials',
        severity: 'medium',
        req,
        identifier: normalizedEmail || normalizedPhone || identifier,
        details: { statusCode: 401, reason: 'invalid_credentials' },
      });
      return failure('Invalid credentials', 401);
    }

    const role = user.role || 'customer';
    if (role !== 'admin' && role !== 'super_admin' && role !== 'business_admin') {
      await logSecurityEvent({
        action: 'studio_login_blocked',
        message: 'Studio login blocked: insufficient role',
        severity: 'high',
        req,
        user: { _id: user._id?.toString?.() ?? String(user._id), email: user.email, role: role, tenantId: user.tenantId },
        details: { statusCode: 403, role },
      });
      return failure('Forbidden', 403);
    }

    const jwtPayload = {
      userId: String(user._id),
      role,
      email: user.email || null,
      ...(user.tenantId ? { tenantId: String(user.tenantId) } : {}),
    };

    const token = signJwt(jwtPayload, { expiresIn: rememberMe ? '30d' : '7d' });

    return NextResponse.json({
      ok: true,
      token,
      user: {
        _id: user._id?.toString?.() ?? String(user._id),
        role,
        email: user.email || null,
        fullName: user.fullName || null,
        tenantId: user.tenantId ? String(user.tenantId) : null,
      },
    }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error('POST /api/studio/auth/login error:', err);
    await logSecurityEvent({
      action: 'studio_login_error',
      message: 'Studio login error: server exception',
      severity: 'high',
      req,
      details: { statusCode: 500, error: err?.message || String(err) },
    });
    return failure('Server error', 500);
  }
}

export const POST = withErrorLogging(POSTHandler);
