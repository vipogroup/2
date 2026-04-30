import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuthApi } from '@/lib/auth/server';
import { apiDebugLog } from '@/lib/apiDebugLog';

const SETTINGS_KEY = 'auth_settings';

// Default auth settings
const DEFAULT_AUTH_SETTINGS = {
  emailVerificationEnabled: false, // Default: disabled for easier testing
  updatedAt: null,
  updatedBy: null,
};

/**
 * GET /api/admin/settings/auth
 * Returns the current auth settings
 * Accessible by: admin, super_admin (for management) and public API (for registration check)
 */
async function GETHandler(req) {
  try {
    const db = await getDb();
    const settings = await db.collection('settings').findOne({ key: SETTINGS_KEY });
    
    const authSettings = settings || DEFAULT_AUTH_SETTINGS;
    
    return NextResponse.json({
      ok: true,
      settings: {
        emailVerificationEnabled: authSettings.emailVerificationEnabled ?? false,
        updatedAt: authSettings.updatedAt || null,
        updatedBy: authSettings.updatedBy || null,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/settings/auth error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to get settings' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/settings/auth
 * Updates auth settings
 * Accessible by: admin, super_admin only
 */
async function PATCHHandler(req) {
  try {
    // Require admin authentication
    const user = await requireAuthApi(req);
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { emailVerificationEnabled } = body;

    if (typeof emailVerificationEnabled !== 'boolean') {
      return NextResponse.json(
        { ok: false, error: 'emailVerificationEnabled must be a boolean' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const now = new Date();

    await db.collection('settings').updateOne(
      { key: SETTINGS_KEY },
      {
        $set: {
          key: SETTINGS_KEY,
          emailVerificationEnabled,
          updatedAt: now,
          updatedBy: user._id || user.id,
          updatedByEmail: user.email,
        },
      },
      { upsert: true }
    );

    // Log the change
    apiDebugLog(`[AUTH_SETTINGS] Updated by ${user.email}: emailVerificationEnabled=${emailVerificationEnabled}`);

    return NextResponse.json({
      ok: true,
      settings: {
        emailVerificationEnabled,
        updatedAt: now,
        updatedBy: user._id || user.id,
      },
    });
  } catch (error) {
    console.error('PATCH /api/admin/settings/auth error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to update settings' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const PATCH = withErrorLogging(PATCHHandler);
