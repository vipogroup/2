import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { logAdminActivity } from '@/lib/auditMiddleware';
import { rateLimiters } from '@/lib/rateLimit';

// Helper to get tasks collection
async function getTasksCollection() {
  const { getDb } = await import('@/lib/db');
  const db = await getDb();
  return db.collection('admin_tasks');
}

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

// GET - List all tasks
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
    const col = await getTasksCollection();
    const tasks = await col.find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST - Create new task
async function POSTHandler(req) {
  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, description, type, priority } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const col = await getTasksCollection();
    const newTask = {
      title,
      description: description || '',
      type: type || 'task',
      priority: priority || 'medium',
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user.email || user.userId
    };

    const result = await col.insertOne(newTask);
    newTask._id = result.insertedId;

    // Log task creation
    await logAdminActivity({
      action: 'create',
      entity: 'task',
      entityId: String(result.insertedId),
      userId: user.userId,
      userEmail: user.email,
      description: `יצירת משימה: ${title}`,
      metadata: { type, priority }
    });

    return NextResponse.json({ success: true, task: newTask });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
