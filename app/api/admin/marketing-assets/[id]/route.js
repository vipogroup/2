import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { requireAdminApi } from '@/lib/auth/server';
import { updateMarketingAsset, deleteMarketingAsset } from '@/lib/marketing';
import { getDb } from '@/lib/db';
import { isSuperAdmin } from '@/lib/tenant/tenantMiddleware';

// Helper: Check if user can access this asset
async function canAccessAsset(admin, assetId) {
  if (isSuperAdmin(admin)) return true;
  if (!admin.tenantId) return false;
  
  const db = await getDb();
  const asset = await db.collection('marketing_assets').findOne({ 
    _id: new ObjectId(assetId) 
  });
  
  if (!asset) return false;
  
  // Asset without tenantId = global (super admin only)
  if (!asset.tenantId) return false;
  
  // Check ownership
  return asset.tenantId.toString() === admin.tenantId.toString();
}

function validateUpdatePayload(payload) {
  const errors = {};

  if (payload.title !== undefined && !payload.title.trim()) {
    errors.title = 'נדרש שם נכס';
  }

  if (payload.type !== undefined && !['video', 'image'].includes(payload.type)) {
    errors.type = 'סוג לא תקין';
  }

  if (payload.mediaUrl !== undefined && !payload.mediaUrl.trim()) {
    errors.mediaUrl = 'נדרש קישור למדיה';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

async function PATCHHandler(req, { params }) {
  try {
    const admin = await requireAdminApi(req);
    
    // Multi-Tenant: Check ownership
    const canAccess = await canAccessAsset(admin, params.id);
    if (!canAccess) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const { valid, errors } = validateUpdatePayload(payload);
    if (!valid) {
      return NextResponse.json({ ok: false, error: 'validation_error', details: errors }, { status: 400 });
    }

    const updated = await updateMarketingAsset(params.id, {
      ...payload,
      title: payload.title?.trim(),
      mediaUrl: payload.mediaUrl?.trim(),
      thumbnailUrl: payload.thumbnailUrl?.trim(),
    });

    if (!updated) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      asset: {
        id: updated._id?.toString() ?? null,
        title: updated.title ?? '',
        type: updated.type ?? 'video',
        mediaUrl: updated.mediaUrl ?? '',
        thumbnailUrl: updated.thumbnailUrl ?? null,
        messageTemplate: updated.messageTemplate ?? '',
        target: updated.target ?? { type: 'products' },
        isActive: updated.isActive !== false,
        updatedAt: updated.updatedAt ?? null,
        tags: updated.tags ?? [],
      },
    });
  } catch (error) {
    console.error('ADMIN_MARKETING_ASSET_UPDATE_ERROR', error);
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

async function DELETEHandler(req, { params }) {
  try {
    const admin = await requireAdminApi(req);
    
    // Multi-Tenant: Check ownership
    const canAccess = await canAccessAsset(admin, params.id);
    if (!canAccess) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const deleted = await deleteMarketingAsset(params.id);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('ADMIN_MARKETING_ASSET_DELETE_ERROR', error);
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

async function GETHandler(req, { params }) {
  try {
    const admin = await requireAdminApi(req);
    
    // Multi-Tenant: Check ownership
    const canAccess = await canAccessAsset(admin, params.id);
    if (!canAccess) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const db = await getDb();
    const asset = await db.collection('marketing_assets').findOne({ _id: new ObjectId(params.id) });

    if (!asset) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      asset: {
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
      },
    });
  } catch (error) {
    console.error('ADMIN_MARKETING_ASSET_GET_ERROR', error);
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

export const PATCH = withErrorLogging(PATCHHandler);
export const DELETE = withErrorLogging(DELETEHandler);
export const GET = withErrorLogging(GETHandler);
