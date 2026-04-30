import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { getToken } from 'next-auth/jwt';
import { commissionPerReferral } from '@/app/config/commissions';
import { apiDebugLog } from '@/lib/apiDebugLog';

/**
 * API route to complete Google OAuth registration
 * Updates phone number and processes referral attribution
 * Called from client after Google OAuth redirect
 */

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
  try {
    // Get the NextAuth token to identify the user
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token?.email) {
      return NextResponse.json(
        { ok: false, error: 'not_authenticated' },
        { status: 401 }
      );
    }

    const email = token.email.toLowerCase().trim();
    const body = await req.json();
    const { phone, fullName, tenantSlug } = body;
    const normalizedPhone = normalizePhone(phone);

    const db = await getDb();
    const users = db.collection('users');
    const tenants = db.collection('tenants');

    // Find the user by email
    const user = await users.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'user_not_found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData = {
      updatedAt: new Date(),
    };

    // Associate with tenant if provided and user doesn't have one
    if (tenantSlug && !user.tenantId) {
      const normalizedSlug = tenantSlug.toLowerCase().trim().replace(/^-+|-+$/g, '');
      const tenant = await tenants.findOne({ slug: normalizedSlug, status: 'active' });
      if (tenant) {
        updateData.tenantId = tenant._id;
        apiDebugLog('[COMPLETE_GOOGLE] Associating user with tenant:', email, normalizedSlug);
      }
    }

    // Update fullName if provided and different from current
    if (fullName && fullName.trim() && fullName.trim() !== user.fullName) {
      updateData.fullName = fullName.trim();
      apiDebugLog('[COMPLETE_GOOGLE] Updating fullName for user:', email, fullName.trim());
    }

    // Update phone if provided and user doesn't have one
    if (normalizedPhone && !user.phone) {
      // Check if phone already exists for another user
      const phoneExists = await users.findOne({ 
        phone: normalizedPhone, 
        _id: { $ne: user._id } 
      });
      
      if (phoneExists) {
        apiDebugLog('[COMPLETE_GOOGLE] Phone already exists for another user:', normalizedPhone);
      } else {
        updateData.phone = normalizedPhone;
        apiDebugLog('[COMPLETE_GOOGLE] Adding phone to user:', email, normalizedPhone);
      }
    }

    // Process referral if user doesn't have one yet
    if (!user.referredBy) {
      const cookieStore = cookies();
      const refSource = cookieStore.get('refSource')?.value || null;

      if (refSource) {
        try {
          const refUserId = new ObjectId(refSource);
          const refUser = await users.findOne(
            { _id: refUserId },
            { projection: { _id: 1 } }
          );

          if (refUser && String(refUser._id) !== String(user._id)) {
            updateData.referredBy = refUser._id;
            apiDebugLog('[COMPLETE_GOOGLE] Setting referrer for user:', email, 'referrer:', refSource);

            // Update referrer's counter and commission
            await users.updateOne(
              { _id: refUser._id },
              {
                $inc: {
                  referralsCount: 1,
                  referralCount: 1,
                  commissionBalance: commissionPerReferral,
                },
              }
            );

            apiDebugLog('[COMPLETE_GOOGLE] REFERRAL_APPLIED', {
              referrerId: String(refUser._id),
              newUserId: String(user._id),
              delta: commissionPerReferral,
            });
          }
        } catch (err) {
          apiDebugLog('[COMPLETE_GOOGLE] Invalid referrer ID:', refSource, err.message);
        }
      }
    }

    // Apply updates if any
    if (Object.keys(updateData).length > 1) { // More than just updatedAt
      await users.updateOne(
        { _id: user._id },
        { $set: updateData }
      );
      apiDebugLog('[COMPLETE_GOOGLE] User updated:', email, updateData);
    }

    // Clear refSource cookie
    const res = NextResponse.json(
      { ok: true, userId: String(user._id) },
      { status: 200 }
    );
    res.cookies.set('refSource', '', { path: '/', maxAge: 0 });

    return res;
  } catch (e) {
    console.error('[COMPLETE_GOOGLE] Error:', e);
    return NextResponse.json(
      { ok: false, error: 'server_error' },
      { status: 500 }
    );
  }
}

export const POST = withErrorLogging(POSTHandler);
