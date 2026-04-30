import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { rateLimiters } from '@/lib/rateLimit';

const MAX_ATTEMPTS = 5;

async function POSTHandler(req) {
  // Rate limiting
  const rateLimit = rateLimiters.login(req);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'TOO_MANY_REQUESTS', message: rateLimit.message },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
    );
  }

  const body = await req.json();
  const schema = z.object({ 
    email: z.string().email(),
    code: z.string().min(4).max(6),
  });
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const code = parsed.data.code.trim();

  try {
    const db = await getDb();
    const collection = db.collection('email_verification_codes');

    const record = await collection.findOne({ email });
    if (!record) {
      return NextResponse.json({ error: 'no_code', message: 'לא נמצא קוד. שלח קוד חדש.' }, { status: 400 });
    }

    // Check expiry
    const now = Date.now();
    if (record.expiresAt && record.expiresAt.getTime() < now) {
      await collection.deleteOne({ email });
      return NextResponse.json({ error: 'expired', message: 'הקוד פג תוקף. שלח קוד חדש.' }, { status: 400 });
    }

    // Check code
    if (record.code !== code) {
      const attempts = (record.attempts || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await collection.deleteOne({ email });
        return NextResponse.json({ error: 'max_attempts', message: 'יותר מדי ניסיונות. שלח קוד חדש.' }, { status: 400 });
      }
      await collection.updateOne({ email }, { $set: { attempts } });
      return NextResponse.json({ error: 'invalid_code', message: 'קוד שגוי. נסה שוב.' }, { status: 400 });
    }

    // Success - delete the code
    await collection.deleteOne({ email });

    return NextResponse.json({ ok: true, verified: true });
  } catch (err) {
    console.error('[EMAIL_CODE] verify failed', err?.message || err);
    return NextResponse.json({ error: 'verify_failed' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
