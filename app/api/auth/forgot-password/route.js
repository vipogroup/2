import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { sendEmail } from '@/lib/email';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // שעה
const MAX_REQUESTS_PER_WINDOW = 5;

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

function resolveOrigin(request) {
  const originHeader = request.headers.get('origin');
  if (originHeader) {
    return originHeader;
  }

  const protocol = request.nextUrl?.protocol || 'http:';
  const host = request.headers.get('host');
  if (host) {
    return `${protocol}//${host}`;
  }

  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL.replace(/\/$/, '');
  }

  const url = new URL(request.url);
  url.pathname = '';
  url.search = '';
  return url.toString().replace(/\/$/, '');
}

async function POSTHandler(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
    }

    const email = String(body?.email || '')
      .toLowerCase()
      .trim();
    if (!email) {
      return NextResponse.json({ ok: false, error: 'missing_email' }, { status: 400 });
    }

    const db = await getDb();
    const users = db.collection('users');
    const user = await users.findOne({ email });

    if (!user) {
      // אל תחשוף אם המשתמש לא קיים
      return NextResponse.json({ ok: true });
    }

    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    const attempts = Array.isArray(user.passwordResetAttempts)
      ? user.passwordResetAttempts.filter((ts) => Number(new Date(ts)) >= windowStart)
      : [];

    if (attempts.length >= MAX_REQUESTS_PER_WINDOW) {
      // גם כאן מחזירים ok כדי לא לחשוף יותר מדי מידע
      return NextResponse.json({ ok: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const ttl = user.role === 'admin' ? 1000 * 60 * 10 : 1000 * 60 * 30; // Admin: 10 דק'
    const expires = new Date(now + ttl);

    const updatedAttempts = [...attempts, new Date(now).toISOString()];

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetToken: hashedToken,
          passwordResetExpires: expires,
          passwordResetAttempts: updatedAttempts,
          lastPasswordResetRequestAt: new Date(now),
          lastPasswordResetRequestIp: getClientIp(request),
        },
        $push: {
          passwordResetAudit: {
            type: 'request',
            requestedAt: new Date(now),
            ip: getClientIp(request),
          },
        },
      },
    );

    const origin = resolveOrigin(request);
    const resetLink = `${origin}/reset-password/${token}`;

    await sendEmail({
      to: user.email,
      subject: 'איפוס סיסמה - VIPO',
      text: `שלום ${user.fullName || ''},\n\nקיבלת בקשה לאיפוס סיסמה. ניתן לאפס באמצעות הקישור: ${resetLink}\n\nאם לא ביקשת איפוס, ניתן להתעלם מההודעה.`,
      html: `
        <p>שלום ${user.fullName || ''},</p>
        <p>התקבלה בקשה לאיפוס הסיסמה שלך במערכת VIPO.</p>
        <p>
          <a href="${resetLink}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px">
            לאיפוס סיסמה לחץ כאן
          </a>
        </p>
        <p>הקישור בתוקף למשך 30 דקות. אם לא ביקשת איפוס, ניתן להתעלם מהודעה זו.</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('FORGOT_PASSWORD_ERROR', error);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
