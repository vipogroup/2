import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { requireAgentApi } from '@/lib/auth/server';

async function GETHandler(req) {
  try {
    await requireAgentApi(req);

    const db = await getDb();
    const collection = db.collection('marketing_assets');

    const assets = await collection
      .find({ $or: [{ isActive: { $exists: false } }, { isActive: { $ne: false } }] })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    const items = assets.map((asset) => ({
      id: asset._id?.toString() ?? null,
      title: asset.title ?? '',
      type: asset.type ?? 'video',
      mediaUrl: asset.mediaUrl ?? '',
      thumbnailUrl: asset.thumbnailUrl ?? null,
      messageTemplate: asset.messageTemplate ?? '',
      target: asset.target ?? { type: 'products' },
      isActive: asset.isActive !== false,
      createdAt: asset.createdAt ?? null,
      updatedAt: asset.updatedAt ?? null,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error('AGENT_MARKETING_ASSETS_ERROR', error);
    const status = error?.status ?? 500;
    const message =
      status === 401
        ? 'unauthorized'
        : status === 403
          ? 'forbidden'
          : 'server_error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
