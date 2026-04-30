/**
 * API Route: /api/admin/impersonate
 * מאפשר ל-Super Admin להיכנס לדשבורד של עסק ספציפי
 */

import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminGuard } from '@/lib/auth/requireAuth';
import { isSuperAdmin } from '@/lib/tenant';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { apiDebugLog } from '@/lib/apiDebugLog';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * POST /api/admin/impersonate - התחזות לעסק ספציפי
 * רק Super Admin יכול להתחזות
 */
async function POSTHandler(request) {
  apiDebugLog('[IMPERSONATE API] POST request received');
  try {
    const authResult = await requireAdminGuard(request);
    apiDebugLog('[IMPERSONATE API] Auth result:', authResult.ok ? 'OK' : authResult.error);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;
    apiDebugLog('[IMPERSONATE API] User:', user.email, 'Role:', user.role);
    
    // Only super admin can impersonate
    if (!isSuperAdmin(user)) {
      return NextResponse.json(
        { error: 'אין הרשאה להתחזות לעסק' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { tenantId } = body;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'נדרש מזהה עסק' },
        { status: 400 }
      );
    }
    
    const db = await getDb();
    
    // Verify tenant exists
    const tenant = await db.collection('tenants').findOne({ 
      _id: new ObjectId(tenantId) 
    });
    
    if (!tenant) {
      return NextResponse.json(
        { error: 'העסק לא נמצא' },
        { status: 404 }
      );
    }
    
    // Create a new JWT token with the tenantId for impersonation
    const impersonationPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: 'business_admin', // Treat as business admin in the tenant context
      tenantId: tenantId,
      impersonating: true,
      originalRole: 'admin', // Keep track of original role
      originalTenantId: null, // Super admin has no tenantId
    };
    
    const token = jwt.sign(impersonationPayload, JWT_SECRET, { expiresIn: '2h' });
    
    // Set the impersonation cookie
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60, // 2 hours
      path: '/',
    });
    
    // Also set a flag to show impersonation banner
    cookieStore.set('impersonating_tenant', tenant.name, {
      httpOnly: false, // Allow JS to read this for UI
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60,
      path: '/',
    });
    
    return NextResponse.json({
      ok: true,
      message: `נכנסת לדשבורד של ${tenant.name}`,
      tenant: {
        _id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
      },
    });
  } catch (error) {
    console.error('POST /api/admin/impersonate error:', error);
    return NextResponse.json(
      { error: error.message || 'שגיאה בכניסה לדשבורד' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/impersonate - יציאה מהתחזות וחזרה ל-Super Admin
 */
async function DELETEHandler(request) {
  try {
    const authResult = await requireAdminGuard(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;
    
    // Check if user is impersonating
    if (!user.impersonating) {
      return NextResponse.json(
        { error: 'אינך במצב התחזות' },
        { status: 400 }
      );
    }
    
    const db = await getDb();
    
    // Get original user data
    const originalUser = await db.collection('users').findOne({ 
      _id: new ObjectId(user.userId || user._id) 
    });
    
    if (!originalUser) {
      return NextResponse.json(
        { error: 'משתמש לא נמצא' },
        { status: 404 }
      );
    }
    
    // Create original JWT token
    const originalPayload = {
      userId: originalUser._id.toString(),
      email: originalUser.email,
      role: originalUser.role,
      tenantId: originalUser.tenantId?.toString() || null,
    };
    
    const token = jwt.sign(originalPayload, JWT_SECRET, { expiresIn: '7d' });
    
    // Set the original cookie back
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    
    // Remove impersonation flag cookie
    cookieStore.delete('impersonating_tenant');
    
    return NextResponse.json({
      ok: true,
      message: 'חזרת למצב מנהל ראשי',
    });
  } catch (error) {
    console.error('DELETE /api/admin/impersonate error:', error);
    return NextResponse.json(
      { error: error.message || 'שגיאה ביציאה מהתחזות' },
      { status: 500 }
    );
  }
}

export const POST = withErrorLogging(POSTHandler);
export const DELETE = withErrorLogging(DELETEHandler);
