import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';

const SupportMessage = mongoose.models.SupportMessage;

// GET - Get single message
async function GETHandler(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const message = await SupportMessage.findById(id).lean();
    
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json(message);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch message' }, { status: 500 });
  }
}

// PATCH - Update message (mark as read, reply, close)
async function PATCHHandler(request, { params }) {
  try {
    await dbConnect();

    // Check admin auth
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    
    if (!tokenMatch) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(tokenMatch[1], process.env.JWT_SECRET);
    
    if (!['admin', 'superadmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { status, adminReply } = body;

    const updateData = {};
    if (status) updateData.status = status;
    if (adminReply) {
      updateData.adminReply = adminReply;
      updateData.repliedAt = new Date();
      updateData.repliedBy = decoded.userId;
      updateData.status = 'replied';
    }

    const message = await SupportMessage.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).lean();

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json(message);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}

// DELETE - Delete message
async function DELETEHandler(request, { params }) {
  try {
    await dbConnect();

    // Check admin auth
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    
    if (!tokenMatch) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(tokenMatch[1], process.env.JWT_SECRET);
    
    if (!['admin', 'superadmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    await SupportMessage.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const PATCH = withErrorLogging(PATCHHandler);
export const DELETE = withErrorLogging(DELETEHandler);
