import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { rateLimiters } from '@/lib/rateLimit';

const ACTIVITY_LOGS_COLLECTION = 'activity_logs';

// Helper to check if user is admin
async function checkAdmin(req) {
  const cookieHeader = req.headers.get('cookie') || '';
  const authTokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
  const legacyTokenMatch = cookieHeader.match(/token=([^;]+)/);
  const tokenValue = authTokenMatch?.[1] || legacyTokenMatch?.[1];
  
  if (!tokenValue) return null;
  
  try {
    const { jwtVerify } = await import('jose');
    if (!process.env.JWT_SECRET) return null;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(decodeURIComponent(tokenValue), secret);
    if (payload.role !== 'admin' && payload.role !== 'super_admin') return null;
    return payload;
  } catch {
    return null;
  }
}

// GET - Fetch activity logs
async function GETHandler(req) {
  // Rate limiting
  const rateLimit = rateLimiters.admin(req);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.message }, { status: 429 });
  }

  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action'); // create, update, delete, login, etc.
    const category = searchParams.get('category');
    const userId = searchParams.get('userId');

    const db = await getDb();
    
    let query = {};
    if (action) query.action = action;
    if (category) query.category = category;
    if (userId) query.userId = userId;

    const logs = await db.collection(ACTIVITY_LOGS_COLLECTION)
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Get stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = {
      total: await db.collection(ACTIVITY_LOGS_COLLECTION).countDocuments(),
      today: await db.collection(ACTIVITY_LOGS_COLLECTION).countDocuments({
        createdAt: { $gte: today }
      }),
      actions: {
        create: await db.collection(ACTIVITY_LOGS_COLLECTION).countDocuments({ action: 'create' }),
        update: await db.collection(ACTIVITY_LOGS_COLLECTION).countDocuments({ action: 'update' }),
        delete: await db.collection(ACTIVITY_LOGS_COLLECTION).countDocuments({ action: 'delete' }),
        login: await db.collection(ACTIVITY_LOGS_COLLECTION).countDocuments({ action: 'login' })
      }
    };

    return NextResponse.json({ 
      success: true, 
      logs,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 });
  }
}

// POST - Log a new activity
async function POSTHandler(req) {
  try {
    const body = await req.json();
    const { 
      action, // create, update, delete, login, logout, settings, etc.
      entity, // user, product, order, settings, etc.
      entityId,
      userId,
      userEmail,
      description,
      metadata 
    } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const db = await getDb();
    
    const logEntry = {
      action,
      entity: entity || null,
      entityId: entityId || null,
      userId: userId || null,
      userEmail: userEmail || null,
      description: description || `${action} on ${entity || 'unknown'}`,
      metadata: metadata || {},
      ip: null, // Could be extracted from headers if needed
      createdAt: new Date()
    };

    await db.collection(ACTIVITY_LOGS_COLLECTION).insertOne(logEntry);

    return NextResponse.json({ success: true, log: logEntry });
  } catch (error) {
    console.error('Error logging activity:', error);
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 });
  }
}

// DELETE - Clear old activity logs
async function DELETEHandler(req) {
  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '90');

    const db = await getDb();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await db.collection(ACTIVITY_LOGS_COLLECTION).deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error deleting activity logs:', error);
    return NextResponse.json({ error: 'Failed to delete activity logs' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
export const DELETE = withErrorLogging(DELETEHandler);
