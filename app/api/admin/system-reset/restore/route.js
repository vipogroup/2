/**
 * POST /api/admin/system-reset/restore
 * שחזור תבניות catalog מגיבוי (מה-DB או מקובץ JSON שהועלה).
 * 
 * body.source = 'db'   → שחזור מ-system_backups לפי backupId
 * body.source = 'file' → שחזור מ-templates array שהועלה
 */

import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { ObjectId } from 'mongodb';
import { isSuperAdminUser } from '@/lib/superAdmins';

export const dynamic = 'force-dynamic';

const SYSTEM_RESTORE_CONFIRM_TOKEN = 'RESTORE_SYSTEM_IRREVERSIBLE';
const SYSTEM_RESTORE_TARGET_COLLECTIONS = ['catalogtemplates'];

function blockedRestoreResponse() {
  return NextResponse.json(
    {
      error: 'system_restore_blocked',
      message: 'System restore is blocked without explicit super-admin confirmation.',
    },
    { status: 403 },
  );
}

function normalizeCollectionList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
}

function normalizeTemplateDoc(input) {
  const doc = { ...input };
  if (doc._id && ObjectId.isValid(doc._id)) {
    doc._id = new ObjectId(doc._id);
  } else {
    delete doc._id;
  }
  if (doc.tenantId && ObjectId.isValid(doc.tenantId)) {
    doc.tenantId = new ObjectId(doc.tenantId);
  }
  if (doc.createdAt && typeof doc.createdAt === 'string') doc.createdAt = new Date(doc.createdAt);
  if (doc.updatedAt && typeof doc.updatedAt === 'string') doc.updatedAt = new Date(doc.updatedAt);
  delete doc.__v;
  return doc;
}

async function POSTHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    if (!isSuperAdminUser(admin)) {
      return blockedRestoreResponse();
    }

    const body = await req.json().catch(() => ({}));
    const { source, backupId, templates: uploadedTemplates } = body;
    const dryRun = body?.dryRun !== false;
    const nodeEnv = process.env.NODE_ENV || 'development';
    const allowSystemRestore = process.env.ALLOW_SYSTEM_RESTORE === 'true';

    const db = await getDb();
    let templatesToRestore = [];
    let sourceMeta = {};

    if (source === 'db') {
      if (!backupId || !ObjectId.isValid(backupId)) {
        return NextResponse.json({ error: 'invalid_backup_id' }, { status: 400 });
      }
      const backup = await db.collection('system_backups').findOne({ _id: new ObjectId(backupId) });
      if (!backup?.templates?.length) {
        return NextResponse.json({ error: 'backup_not_found_or_empty' }, { status: 404 });
      }
      templatesToRestore = backup.templates;
      sourceMeta = { source: 'db', backupId: String(backupId) };
    } else if (source === 'file') {
      if (!Array.isArray(uploadedTemplates) || uploadedTemplates.length === 0) {
        return NextResponse.json({ error: 'no_templates_in_file' }, { status: 400 });
      }
      templatesToRestore = uploadedTemplates;
      sourceMeta = { source: 'file' };
    } else {
      return NextResponse.json({ error: 'invalid_source' }, { status: 400 });
    }

    const targetCollections = SYSTEM_RESTORE_TARGET_COLLECTIONS;
    const currentCounts = {
      catalogtemplates: await db.collection('catalogtemplates').countDocuments({}),
    };
    const restoreCounts = {
      catalogtemplates: templatesToRestore.length,
    };

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        deleteEnabled: false,
        targetCollections,
        currentCounts,
        restoreCounts,
        source: sourceMeta,
        message: 'System restore dry-run preview only. No data was modified.',
      });
    }

    if (nodeEnv === 'production' && !allowSystemRestore) {
      return blockedRestoreResponse();
    }

    const confirm = String(body?.confirm || '').trim();
    const acknowledgeOverwrite = body?.acknowledgeOverwrite === true;
    const reason = String(body?.reason || '').trim();
    const confirmEnvironment = String(body?.confirmEnvironment || '').trim();
    const confirmCollections = normalizeCollectionList(body?.confirmCollections);
    const hasAllCollections = targetCollections.every((name) => confirmCollections.includes(name));

    const guardsOk =
      confirm === SYSTEM_RESTORE_CONFIRM_TOKEN &&
      acknowledgeOverwrite === true &&
      reason.length > 0 &&
      confirmEnvironment === nodeEnv &&
      hasAllCollections;

    if (!guardsOk) {
      return blockedRestoreResponse();
    }

    console.warn('[SYSTEM_RESTORE_AUDIT]', {
      action: 'restore_system',
      actorId: admin?.id || admin?._id || null,
      actorEmail: admin?.email || null,
      actorRole: admin?.role || null,
      reason,
      NODE_ENV: nodeEnv,
      ALLOW_SYSTEM_RESTORE: allowSystemRestore,
      dryRun: false,
      targetCollections,
      currentCounts,
      restoreCounts,
      source: sourceMeta,
    });

    await db.collection('catalogtemplates').deleteMany({});

    let restored = 0;
    for (const t of templatesToRestore) {
      try {
        const doc = normalizeTemplateDoc(t);
        await db.collection('catalogtemplates').insertOne(doc);
        restored++;
      } catch (e) {
        console.error('Failed to restore template:', t?.key || t?.name, e?.message);
      }
    }
    return NextResponse.json({
      ok: true,
      message: `Restored ${restored} templates`,
      restored,
      total: templatesToRestore.length,
      source: sourceMeta,
    });
  } catch (error) {
    console.error('SYSTEM_RESTORE_ERROR', error?.message || error);
    const status = error?.status || 500;
    return NextResponse.json({ error: status === 401 ? 'unauthorized' : 'server_error' }, { status });
  }

}

export const POST = withErrorLogging(POSTHandler);
