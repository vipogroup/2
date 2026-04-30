import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';

const ALERTS_COLLECTION = 'system_alerts';

// Helper to check if user is admin
async function checkAdmin(req) {
  try {
    return await requireAdminApi(req);
  } catch {
    return null;
  }
}

// GET - Fetch active alerts
async function GETHandler(req) {
  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting
  const identifier = buildRateLimitKey(req, user.id || user._id);
  const rateLimit = rateLimiters.admin(req, identifier);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.message }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    const db = await getDb();
    
    let query = {};
    if (unreadOnly) {
      query.read = false;
    }

    const alerts = await db.collection(ALERTS_COLLECTION)
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    const unreadCount = await db.collection(ALERTS_COLLECTION).countDocuments({ read: false });

    return NextResponse.json({ 
      success: true, 
      alerts,
      unreadCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

// POST - Create a new alert
async function POSTHandler(req) {
  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const identifier = buildRateLimitKey(req, user.id || user._id);
  const rateLimit = rateLimiters.adminAlertsCreate(req, identifier);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.message }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { 
      type = 'info', // error, warning, info, success
      title,
      message,
      source,
      metadata 
    } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const db = await getDb();
    
    const alert = {
      type,
      title,
      message,
      source: source || 'system',
      metadata: metadata || {},
      createdBy: user.email || null,
      read: false,
      readAt: null,
      readBy: null,
      createdAt: new Date()
    };

    await db.collection(ALERTS_COLLECTION).insertOne(alert);

    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}

// PATCH - Mark alert(s) as read
async function PATCHHandler(req) {
  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const identifier = buildRateLimitKey(req, user.id || user._id);
  const rateLimit = rateLimiters.admin(req, identifier);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.message }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { id, markAll } = body;

    const db = await getDb();
    
    if (markAll) {
      await db.collection(ALERTS_COLLECTION).updateMany(
        { read: false },
        { 
          $set: { 
            read: true,
            readAt: new Date(),
            readBy: user.email
          } 
        }
      );
    } else if (id) {
      const { ObjectId } = await import('mongodb');
      await db.collection(ALERTS_COLLECTION).updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            read: true,
            readAt: new Date(),
            readBy: user.email
          } 
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}

// DELETE - Delete old alerts
async function DELETEHandler(req) {
  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const identifier = buildRateLimitKey(req, user.id || user._id);
  const rateLimit = rateLimiters.admin(req, identifier);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.message }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    const db = await getDb();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await db.collection(ALERTS_COLLECTION).deleteMany({
      createdAt: { $lt: cutoffDate },
      read: true
    });

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error deleting alerts:', error);
    return NextResponse.json({ error: 'Failed to delete alerts' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
export const PATCH = withErrorLogging(PATCHHandler);
export const DELETE = withErrorLogging(DELETEHandler);
