import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';

// Support Message Schema
const supportMessageSchema = new mongoose.Schema({
  message: { type: String, required: true },
  source: { type: String, default: 'chatbot' },
  conversation: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userEmail: { type: String },
  userName: { type: String },
  status: { type: String, enum: ['new', 'read', 'replied', 'closed'], default: 'new' },
  adminReply: { type: String },
  repliedAt: { type: Date },
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const SupportMessage = mongoose.models.SupportMessage || mongoose.model('SupportMessage', supportMessageSchema);

// POST - Create new support message
async function POSTHandler(request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { message, source, conversation } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Try to get user info from session/cookie if available
    let userId = null;
    let userEmail = null;
    let userName = null;

    try {
      const cookieHeader = request.headers.get('cookie') || '';
      const tokenMatch = cookieHeader.match(/token=([^;]+)/);
      if (tokenMatch) {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(tokenMatch[1], process.env.JWT_SECRET);
        userId = decoded.userId;
        userEmail = decoded.email;
        userName = decoded.name;
      }
    } catch (e) {
      // User not logged in - continue without user info
    }

    const supportMessage = await SupportMessage.create({
      message: message.trim(),
      source: source || 'chatbot',
      conversation: conversation || '',
      userId,
      userEmail,
      userName,
      status: 'new'
    });

    return NextResponse.json({ 
      success: true, 
      messageId: supportMessage._id 
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating support message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

// GET - Get all support messages (admin only)
async function GETHandler(request) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;

    const query = {};
    if (status) query.status = status;

    const messages = await SupportMessage.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await SupportMessage.countDocuments(query);
    const newCount = await SupportMessage.countDocuments({ status: 'new' });

    return NextResponse.json({ 
      messages, 
      total,
      newCount,
      page, 
      pages: Math.ceil(total / limit) 
    });

  } catch (error) {
    console.error('Error fetching support messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
export const GET = withErrorLogging(GETHandler);
