import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/hash';

function getClientIp(request) {
  try {
    return (
      request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request?.headers?.get('x-real-ip') ||
      'unknown'
    );
  } catch (error) {
    return 'unknown';
  }
}

function validatePasswordStrength(password, role) {
  const minLength = role === 'admin' ? 10 : 8;
  if (password.length < minLength) {
    return false;
  }

  if (role === 'admin') {
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    return hasUpper && hasLower && hasDigit && hasSymbol;
  }

  return true;
}

async function POSTHandler(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
    }

    const token = String(body?.token || '');
    const password = String(body?.password || '');

    if (!token || !password) {
      return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
    }

    if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Zא-ת]/.test(password)) {
      return NextResponse.json({ ok: false, error: 'password_too_weak' }, { status: 400 });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const db = await getDb();
    const users = db.collection('users');

    const now = new Date();

    const user = await users.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: now },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: 'invalid_or_expired' }, { status: 400 });
    }

    if (!validatePasswordStrength(password, user.role)) {
      return NextResponse.json({ ok: false, error: 'weak_password' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash,
          passwordChangedAt: now,
          passwordResetAttempts: [],
        },
        $unset: { passwordResetToken: '', passwordResetExpires: '' },
        $push: {
          passwordResetAudit: {
            type: 'reset',
            resetAt: now,
            ip: getClientIp(request),
          },
        },
      },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('RESET_PASSWORD_ERROR', error);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
