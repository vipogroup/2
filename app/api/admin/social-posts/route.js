import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { requireAdminApi } from '@/lib/auth/server';
import SocialPublishHistory from '@/models/SocialPublishHistory';

async function handleGet(req) {
  const authError = await requireAdminApi(req);
  if (authError) return authError;

  await connectMongo();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'pending_approval';
  const limit = Math.min(Number(searchParams.get('limit') || 20), 100);
  const page = Math.max(Number(searchParams.get('page') || 1), 1);
  const skip = (page - 1) * limit;

  const filter = {};
  if (status !== 'all') filter.status = status;

  const [posts, total] = await Promise.all([
    SocialPublishHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SocialPublishHistory.countDocuments(filter),
  ]);

  const pendingCount = await SocialPublishHistory.countDocuments({ status: 'pending_approval' });

  return NextResponse.json({ ok: true, posts, total, page, limit, pendingCount });
}

export const GET = withErrorLogging(handleGet);
