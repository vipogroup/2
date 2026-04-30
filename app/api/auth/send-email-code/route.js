import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { rateLimiters } from '@/lib/rateLimit';

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const CODE_RESEND_INTERVAL_MS = 60 * 1000; // 1 minute

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function POSTHandler(req) {
  // Rate limiting
  const rateLimit = rateLimiters.otp(req);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'TOO_MANY_REQUESTS', message: rateLimit.message },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
    );
  }

  const body = await req.json();
  const schema = z.object({ email: z.string().email() });
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();

  try {
    const db = await getDb();
    const collection = db.collection('email_verification_codes');

    // Check for existing code and resend interval
    const now = Date.now();
    const existing = await collection.findOne({ email });
    if (existing && existing.createdAt) {
      const nextAllowed = existing.createdAt.getTime() + CODE_RESEND_INTERVAL_MS;
      if (nextAllowed > now) {
        const waitSeconds = Math.ceil((nextAllowed - now) / 1000);
        return NextResponse.json(
          { error: 'too_soon', message: `נסה שוב בעוד ${waitSeconds} שניות` },
          { status: 429 },
        );
      }
    }

    const code = generateCode();
    const expiresAt = new Date(now + CODE_EXPIRY_MS);
    const createdAt = new Date(now);

    // Save code to database
    await collection.updateOne(
      { email },
      {
        $set: {
          email,
          code,
          attempts: 0,
          expiresAt,
          createdAt,
        },
      },
      { upsert: true },
    );

    // Ensure TTL index exists
    try {
      await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    } catch (e) {
      // Index might already exist
    }

    // Send email
    await sendEmail({
      to: email,
      subject: 'קוד אימות להרשמה - VIPO',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e3a8a; text-align: center;">VIPO</h2>
          <p style="text-align: center; font-size: 16px;">קוד האימות שלך:</p>
          <div style="background: linear-gradient(135deg, #1e3a8a, #0891b2); color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 10px; letter-spacing: 8px;">
            ${code}
          </div>
          <p style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
            הקוד תקף ל-10 דקות בלבד.
          </p>
          <p style="text-align: center; color: #999; font-size: 12px;">
            אם לא ביקשת קוד זה, התעלם מהודעה זו.
          </p>
        </div>
      `,
      text: `קוד האימות שלך ל-VIPO הוא: ${code}. הקוד תקף ל-10 דקות.`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[EMAIL_CODE] send failed', err?.message || err);
    return NextResponse.json({ error: 'send_failed', message: 'שליחת המייל נכשלה' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
