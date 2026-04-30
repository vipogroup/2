export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { headers } from 'next/headers';

/**
 * Short referral link redirect
 * /r/CODE -> redirects to /products with coupon applied
 * Also logs the click for agent statistics
 */
export async function GET(req, context) {
  const params = await context.params;
  const code = params?.code;
  
  if (!code) {
    return NextResponse.redirect(new URL('/shop', req.url));
  }

  // Log the click to referral_logs
  try {
    const db = await getDb();
    const users = db.collection('users');
    const referralLogs = db.collection('referral_logs');

    // Find agent by ref code - could be couponCode, referralId, or ObjectId
    let agent = null;
    agent = await users.findOne({ couponCode: code, role: 'agent' });
    if (!agent) {
      agent = await users.findOne({ referralId: code, role: 'agent' });
    }
    if (!agent) {
      try {
        const objectId = new ObjectId(code);
        agent = await users.findOne({ _id: objectId, role: 'agent' });
      } catch {
        // Not a valid ObjectId
      }
    }

    if (agent) {
      const headersList = headers();
      const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
      const userAgent = headersList.get('user-agent') || 'unknown';

      await referralLogs.insertOne({
        agentId: agent._id,
        refCode: code,
        ip: ip.split(',')[0].trim(),
        userAgent,
        url: req.url,
        action: 'click',
        createdAt: new Date(),
        // Multi-Tenant: Store tenantId for tracking
        ...(agent.tenantId && { tenantId: agent.tenantId }),
      });
      console.log('Referral click logged for agent:', agent._id);

      // Use request URL origin for redirect
      const url = new URL(req.url);
      
      // Multi-Tenant: If agent belongs to a tenant, redirect to tenant store
      let redirectUrl;
      if (agent.tenantId) {
        const tenants = db.collection('tenants');
        const tenant = await tenants.findOne({ _id: agent.tenantId });
        if (tenant?.slug) {
          redirectUrl = new URL(`/t/${tenant.slug}`, url.origin);
        } else {
          redirectUrl = new URL('/shop', url.origin);
        }
      } else {
        redirectUrl = new URL('/shop', url.origin);
      }
      
      const response = NextResponse.redirect(redirectUrl);

      const cookieOptions = {
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        httpOnly: true,
        sameSite: 'lax',
        secure: url.protocol === 'https:',
      };

      // Set referral and coupon cookies
      response.cookies.set('refSource', code, cookieOptions);
      response.cookies.set('autoCoupon', code, cookieOptions);
      
      // Multi-Tenant: Set tenant cookie for product filtering
      if (agent.tenantId) {
        response.cookies.set('refTenant', agent.tenantId.toString(), cookieOptions);
      }

      return response;
    }
  } catch (err) {
    console.error('Error logging referral click:', err);
  }

  // Fallback: redirect to shop if agent not found
  const url = new URL(req.url);
  const redirectUrl = new URL('/shop', url.origin);
  
  const response = NextResponse.redirect(redirectUrl);

  const cookieOptions = {
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    httpOnly: true,
    sameSite: 'lax',
    secure: url.protocol === 'https:',
  };

  // Set referral and coupon cookies even without agent found
  response.cookies.set('refSource', code, cookieOptions);
  response.cookies.set('autoCoupon', code, cookieOptions);

  return response;
}
