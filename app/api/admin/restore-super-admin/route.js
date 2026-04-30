import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth/hash';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// הגדרת המנהל הראשי שצריך להיות במערכת תמיד
const PRIMARY_ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'm0587009938@gmail.com')
  .trim()
  .toLowerCase();
const PRIMARY_ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD || 'zxcvbnm1');
const PRIMARY_ADMIN_PHONE = String(process.env.ADMIN_PHONE || process.env.SUPER_ADMIN_PHONE || '0533752633').trim();
const LEGACY_ADMIN_EMAIL = '0587009938@gmail.com';

const SUPER_ADMIN = {
  email: PRIMARY_ADMIN_EMAIL,
  phone: PRIMARY_ADMIN_PHONE,
  password: PRIMARY_ADMIN_PASSWORD,
  fullName: 'מנהל ראשי',
  role: 'admin',
  isSuperAdmin: true,
  protected: true,
};

function ensureAllowed(req) {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) return { ok: true };

  const secret = req?.headers?.get?.('x-seed-secret');
  const validSecret = process.env.SEED_SECRET;
  if (!validSecret) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  if (!secret || secret !== validSecret) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  return { ok: true };
}

async function POSTHandler(req) {
  try {
    const allow = ensureAllowed(req);
    if (!allow.ok) {
      return NextResponse.json({ error: allow.error }, { status: allow.status });
    }

    const db = await getDb();
    const users = db.collection('users');

    // בדיקה אם המנהל קיים (כולל תמיכה באימייל ישן)
    const existingAdmin = await users.findOne({ email: SUPER_ADMIN.email });
    const legacyAdmin = !existingAdmin
      ? await users.findOne({ email: LEGACY_ADMIN_EMAIL })
      : null;

    if (existingAdmin || legacyAdmin) {
      const target = existingAdmin || legacyAdmin;

      const passwordHash = await hashPassword(SUPER_ADMIN.password);

      // עדכון המנהל הקיים (וגם תיקון אימייל ישן אם צריך)
      await users.updateOne(
        { _id: target._id },
        {
          $set: {
            email: SUPER_ADMIN.email,
            phone: SUPER_ADMIN.phone,
            fullName: SUPER_ADMIN.fullName,
            role: 'admin',
            tenantId: null,
            isSuperAdmin: true,
            protected: true,
            isActive: true,
            passwordHash,
            updatedAt: new Date(),
          },
        },
      );

      return NextResponse.json({
        success: true,
        message: 'Super admin updated successfully',
        action: 'updated',
      });
    }

    // יצירת המנהל מחדש
    const passwordHash = await hashPassword(SUPER_ADMIN.password);
    const now = new Date();

    const newAdmin = {
      email: SUPER_ADMIN.email,
      phone: SUPER_ADMIN.phone,
      fullName: SUPER_ADMIN.fullName,
      role: SUPER_ADMIN.role,
      passwordHash,
      tenantId: null,
      isSuperAdmin: true,
      protected: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      // אין tenantId - זה מנהל ראשי של המערכת,
    };

    await users.insertOne(newAdmin);

    return NextResponse.json({
      success: true,
      message: 'Super admin restored successfully',
      action: 'created',
      admin: {
        email: SUPER_ADMIN.email,
        phone: SUPER_ADMIN.phone,
        fullName: SUPER_ADMIN.fullName,
        role: SUPER_ADMIN.role
      }
    });
    
  } catch (error) {
    console.error('Restore super admin error:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

// פונקציה לבדיקה אם המנהל קיים
async function GETHandler(req) {
  try {
    const allow = ensureAllowed(req);
    if (!allow.ok) {
      return NextResponse.json({ error: allow.error }, { status: allow.status });
    }

    const db = await getDb();
    const users = db.collection('users');
    
    const admin = await users.findOne(
      { email: SUPER_ADMIN.email },
      { projection: { passwordHash: 0 } }
    );
    
    return NextResponse.json({
      exists: !!admin,
      admin: admin ? {
        email: admin.email,
        phone: admin.phone,
        fullName: admin.fullName,
        role: admin.role,
        protected: admin.protected,
        isSuperAdmin: admin.isSuperAdmin
      } : null
    });
    
  } catch (error) {
    console.error('Check super admin error:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
export const GET = withErrorLogging(GETHandler);
