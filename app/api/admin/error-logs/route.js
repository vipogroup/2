import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { rateLimiters } from '@/lib/rateLimit';

const ERROR_LOGS_COLLECTION = 'error_logs';
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

// GET - Fetch error logs
async function GETHandler(req) {
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
    const type = searchParams.get('type') || 'errors'; // errors or activity
    const limit = parseInt(searchParams.get('limit') || '50');
    const level = searchParams.get('level'); // error, warn, info
    const resolved = searchParams.get('resolved'); // true, false

    const db = await getDb();
    const collection = type === 'activity' ? ACTIVITY_LOGS_COLLECTION : ERROR_LOGS_COLLECTION;
    
    let query = {};
    if (level) query.level = level;
    if (resolved !== null && resolved !== undefined) {
      query.resolved = resolved === 'true';
    }

    const logs = await db.collection(collection)
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Get stats
    const stats = {
      total: await db.collection(ERROR_LOGS_COLLECTION).countDocuments(),
      errors: await db.collection(ERROR_LOGS_COLLECTION).countDocuments({ level: 'error' }),
      warnings: await db.collection(ERROR_LOGS_COLLECTION).countDocuments({ level: 'warn' }),
      unresolved: await db.collection(ERROR_LOGS_COLLECTION).countDocuments({ resolved: false }),
      today: await db.collection(ERROR_LOGS_COLLECTION).countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      })
    };

    return NextResponse.json({ 
      success: true, 
      logs,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

// POST - Log a new error
async function POSTHandler(req) {
  try {
    const body = await req.json();
    const { 
      level = 'error', 
      message, 
      source, 
      stack, 
      url, 
      userId,
      metadata 
    } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const db = await getDb();
    
    const logEntry = {
      level,
      message,
      source: source || 'unknown',
      stack: stack || null,
      url: url || null,
      userId: userId || null,
      metadata: metadata || {},
      resolved: false,
      resolvedAt: null,
      resolvedBy: null,
      createdAt: new Date()
    };

    await db.collection(ERROR_LOGS_COLLECTION).insertOne(logEntry);

    return NextResponse.json({ success: true, log: logEntry });
  } catch (error) {
    console.error('Error logging:', error);
    return NextResponse.json({ error: 'Failed to log error' }, { status: 500 });
  }
}

// PATCH - Mark error as resolved
async function PATCHHandler(req) {
  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, resolved = true } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const db = await getDb();
    const { ObjectId } = await import('mongodb');
    
    await db.collection(ERROR_LOGS_COLLECTION).updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          resolved,
          resolvedAt: resolved ? new Date() : null,
          resolvedBy: resolved ? user.email : null
        } 
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating log:', error);
    return NextResponse.json({ error: 'Failed to update log' }, { status: 500 });
  }
}

// DELETE - Clear old logs
async function DELETEHandler(req) {
  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');
    const onlyResolved = searchParams.get('onlyResolved') === 'true';

    const db = await getDb();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let query = { createdAt: { $lt: cutoffDate } };
    if (onlyResolved) {
      query.resolved = true;
    }

    const result = await db.collection(ERROR_LOGS_COLLECTION).deleteMany(query);

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error deleting logs:', error);
    return NextResponse.json({ error: 'Failed to delete logs' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
export const PATCH = withErrorLogging(PATCHHandler);
export const DELETE = withErrorLogging(DELETEHandler);
