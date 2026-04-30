import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { requireAuthApi } from '@/lib/auth/server';
import { connectMongo } from '@/lib/mongoose';
import Message from '@/models/Message';

function normalizeObjectId(value) {
  if (!value || !ObjectId.isValid(value)) return null;
  return new ObjectId(value);
}

async function DELETEHandler(req, { params }) {
  try {
    const user = await requireAuthApi(req);
    await connectMongo();

    const messageId = params?.id;
    const messageObjectId = normalizeObjectId(messageId);
    if (!messageObjectId) {
      return NextResponse.json({ error: 'invalid_message_id' }, { status: 400 });
    }

    const messageDoc = await Message.findById(messageObjectId).lean();
    if (!messageDoc) {
      return NextResponse.json({ error: 'message_not_found' }, { status: 404 });
    }

    const userObjectId = normalizeObjectId(user.id);
    const isAdmin = user.role === 'admin';
    const isSender = userObjectId && messageDoc.senderId && messageDoc.senderId.equals(userObjectId);
    const isTargetUser =
      userObjectId && messageDoc.targetUserId && messageDoc.targetUserId.equals(userObjectId);

    if (!isAdmin && !isSender && !isTargetUser) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    await Message.deleteOne({ _id: messageObjectId });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('MESSAGE_DELETE_ERROR', error);
    const status = error?.status || 500;
    return NextResponse.json({ error: 'Server error' }, { status });
  }
}

export const DELETE = withErrorLogging(DELETEHandler);
