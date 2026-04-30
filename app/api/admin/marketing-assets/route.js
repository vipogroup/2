import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { createMarketingAsset } from '@/lib/marketing';
import { isSuperAdmin } from '@/lib/tenant/tenantMiddleware';

function validatePayload(payload) {
  const errors = {};

  if (!payload?.title?.trim()) {
    errors.title = 'נדרש שם נכס';
  }

  if (!['video', 'image'].includes(payload?.type)) {
    errors.type = 'סוג לא תקין';
  }

  if (!payload?.mediaUrl?.trim()) {
    errors.mediaUrl = 'נדרש קישור למדיה';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);

    const db = await getDb();
    
    // Multi-Tenant: Filter by tenantId for business admins
    const filter = {};
    if (!isSuperAdmin(admin) && admin.tenantId) {
      filter.tenantId = new ObjectId(admin.tenantId);
    }
    
    const assets = await db.collection('marketing_assets').find(filter).sort({ createdAt: -1 }).toArray();

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
      tags: asset.tags ?? [],
    }));

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error('ADMIN_MARKETING_ASSETS_LIST_ERROR', error);
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

async function POSTHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const { valid, errors } = validatePayload(payload);

    if (!valid) {
      return NextResponse.json({ ok: false, error: 'validation_error', details: errors }, { status: 400 });
    }

    // Multi-Tenant: Add tenantId for business admins
    const assetData = {
      title: payload.title.trim(),
      type: payload.type,
      mediaUrl: payload.mediaUrl.trim(),
      thumbnailUrl: payload.thumbnailUrl?.trim() || null,
      messageTemplate: payload.messageTemplate ?? '',
      target: payload.target ?? { type: 'products' },
      isActive: payload.isActive !== false,
      tags: payload.tags ?? [],
    };
    
    if (!isSuperAdmin(admin) && admin.tenantId) {
      assetData.tenantId = new ObjectId(admin.tenantId);
    }
    
    const asset = await createMarketingAsset(assetData);

    return NextResponse.json({
      ok: true,
      asset: {
        id: asset._id?.toString() ?? null,
        title: asset.title,
        type: asset.type,
        mediaUrl: asset.mediaUrl,
        thumbnailUrl: asset.thumbnailUrl,
        messageTemplate: asset.messageTemplate,
        target: asset.target,
        isActive: asset.isActive,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
        tags: asset.tags,
      },
    });
  } catch (error) {
    console.error('ADMIN_MARKETING_ASSETS_CREATE_ERROR', error);
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
export const POST = withErrorLogging(POSTHandler);
