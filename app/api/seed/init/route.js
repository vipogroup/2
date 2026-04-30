import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { hashPassword, verifyPassword } from '@/lib/hash';

async function POSTHandler(req) {
  // Security: Only allow in development or with secret key
  const isProduction = process.env.NODE_ENV === 'production';
  const seedSecret = req.headers.get('x-seed-secret');
  const validSecret = process.env.SEED_SECRET || 'vipo-seed-2024';

  if (isProduction && seedSecret !== validSecret) {
    return NextResponse.json({ error: 'Forbidden - Seed disabled in production' }, { status: 403 });
  }

  try {
    await dbConnect();

    const adminEmail = String(process.env.ADMIN_EMAIL || 'm0587009938@gmail.com').trim().toLowerCase();
    const adminPass = String(process.env.ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD || 'zxcvbnm1');
    const adminPhone = String(process.env.ADMIN_PHONE || process.env.SUPER_ADMIN_PHONE || '0533752633').trim();

    const exists = await User.findOne({ email: adminEmail });

    if (!exists) {
      const passwordHash = await hashPassword(adminPass);
      await User.create({
        email: adminEmail,
        fullName: 'VIPO Admin',
        phone: adminPhone,
        role: 'admin',
        passwordHash,
        tenantId: null,
        isSuperAdmin: true,
        protected: true,
        isActive: true,
      });
    } else {
      const hasCorrectRole = exists.role === 'admin';
      const hasPassword = await verifyPassword(adminPass, exists.passwordHash);

      if (!hasCorrectRole || !hasPassword) {
        exists.role = 'admin';
        exists.passwordHash = await hashPassword(adminPass);
        exists.tenantId = null;
        exists.isSuperAdmin = true;
        exists.protected = true;
        exists.isActive = true;
        if (!exists.phone) {
          exists.phone = adminPhone;
        }
        if (exists.password) {
          exists.password = undefined;
        }
        await exists.save();
      }
    }

    const count = await User.countDocuments({});
    return NextResponse.json({ ok: true, users: count, adminEmail });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
