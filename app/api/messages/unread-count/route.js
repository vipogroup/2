import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { requireAuthApi } from '@/lib/auth/server';
import { connectMongo } from '@/lib/mongoose';
import Message from '@/models/Message';

async function GETHandler(req) {
  try {
    const user = await requireAuthApi(req);
    await connectMongo();

    // Validate user.id before creating ObjectId
    if (!user.id || !ObjectId.isValid(user.id)) {
      return NextResponse.json({ ok: true, count: 0 });
    }
    const userObjectId = new ObjectId(user.id);

    const isSystemAdmin = user.role === 'admin' || user.role === 'super_admin';
    const isBusinessAdmin = user.role === 'business_admin';

    let query;

    if (isSystemAdmin) {
      // System admin sees messages targeted to admin role
      query = {
        $or: [
          { targetUserId: userObjectId },
          { targetRole: 'admin' },
          { targetRole: 'all' },
        ],
        'readBy.userId': { $ne: userObjectId },
      };
    } else if (isBusinessAdmin && user.tenantId) {
      // Business admin sees messages from their tenant only
      const tenantObjectId = ObjectId.isValid(user.tenantId) ? new ObjectId(user.tenantId) : null;
      const tenantString = String(user.tenantId);
      query = {
        $or: [
          { targetUserId: userObjectId },
          { tenantId: tenantObjectId, targetRole: 'business_admin' },
          { tenantId: tenantString, targetRole: 'business_admin' },
        ],
        'readBy.userId': { $ne: userObjectId },
      };
    } else {
      // Regular user (agent/customer) - filter by tenant to prevent leaks
      if (user.tenantId) {
        // User belongs to a tenant - only count messages within their tenant
        const tenantObjectId = ObjectId.isValid(user.tenantId) ? new ObjectId(user.tenantId) : null;
        const tenantString = String(user.tenantId);
        query = {
          $or: [
            { targetUserId: userObjectId },
            { 
              tenantId: { $in: [tenantObjectId, tenantString].filter(Boolean) },
              targetRole: { $in: ['all', user.role] },
            },
          ],
          'readBy.userId': { $ne: userObjectId },
        };
      } else {
        // User without tenant - only count global messages
        query = {
          $or: [
            { targetUserId: userObjectId },
            { 
              tenantId: { $in: [null, undefined] },
              targetRole: { $in: ['all', user.role] },
            },
          ],
          'readBy.userId': { $ne: userObjectId },
        };
      }
    }

    const count = await Message.countDocuments(query);

    return NextResponse.json({ ok: true, count });
  } catch (error) {
    console.error('UNREAD_COUNT_ERROR', error);
    const status = error?.status || 500;
    return NextResponse.json({ error: 'Server error', count: 0 }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
