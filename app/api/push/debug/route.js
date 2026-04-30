import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/auth/server';
import { findSubscriptionsByUserIds, getAllSubscriptions, deleteAllUserSubscriptions } from '@/lib/pushSubscriptions';
import { getWebPushConfig } from '@/lib/webPush';
import { apiDebugLog } from '@/lib/apiDebugLog';

// GET - מידע דיבוג על ההתראות
async function GETHandler(request) {
  try {
    const user = await requireAuthApi(request);
    
    const config = getWebPushConfig();
    const allSubs = await getAllSubscriptions(true);
    const userSubs = await findSubscriptionsByUserIds([user.id]);
    
    // בדיקת iOS subscriptions
    const iosSubs = allSubs.filter(s => 
      s.endpoint?.includes('web.push.apple.com') || 
      s.userAgent?.includes('iPhone') || 
      s.userAgent?.includes('iPad')
    );

    // בדיקת admin subscriptions
    const adminSubs = allSubs.filter(s => s.role === 'admin');
    
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        role: user.role
      },
      vapid: {
        configured: config.configured,
        publicKeyLength: config.publicKey?.length || 0,
        publicKeyPreview: config.publicKey?.slice(0, 30) + '...',
        contact: config.contact
      },
      subscriptions: {
        total: allSubs.length,
        forCurrentUser: userSubs.length,
        iosTotal: iosSubs.length,
        adminTotal: adminSubs.length,
        byRole: {
          admin: allSubs.filter(s => s.role === 'admin').length,
          agent: allSubs.filter(s => s.role === 'agent').length,
          customer: allSubs.filter(s => s.role === 'customer').length,
          unknown: allSubs.filter(s => !s.role).length,
        },
        userSubscriptions: userSubs.map(s => ({
          endpoint: s.endpoint?.slice(0, 60),
          hasKeys: !!s.keys,
          hasAuth: !!s.keys?.auth,
          hasP256dh: !!s.keys?.p256dh,
          role: s.role,
          tags: s.tags,
          revokedAt: s.revokedAt,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          isIOS: s.endpoint?.includes('web.push.apple.com')
        }))
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      ok: false, 
      error: error?.message || 'server_error' 
    }, { status: error?.status || 500 });
  }
}

// DELETE - מחיקת כל ה-subscriptions של המשתמש
async function DELETEHandler(request) {
  try {
    const user = await requireAuthApi(request);
    
    apiDebugLog('DEBUG_DELETE: Deleting all subscriptions for user:', user.id);
    const result = await deleteAllUserSubscriptions(user.id);
    
    return NextResponse.json({
      ok: true,
      deletedCount: result.deletedCount,
      message: `נמחקו ${result.deletedCount} subscriptions. עכשיו כבה והפעל מחדש את ההתראות.`
    });
  } catch (error) {
    return NextResponse.json({ 
      ok: false, 
      error: error?.message || 'server_error' 
    }, { status: error?.status || 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const DELETE = withErrorLogging(DELETEHandler);
