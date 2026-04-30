import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { ObjectId } from 'mongodb';

/**
 * GET /api/admin/social-audit/[id]
 * Get a specific social audit report
 */
async function GETHandler(req, { params }) {
  try {
    const admin = await requireAdminApi(req);
    const { id } = params;

    const db = await getDb();
    const reportsCol = db.collection('social_reports');

    let report;
    
    // Try to find by reportId first, then by _id
    report = await reportsCol.findOne({ reportId: id });
    
    if (!report && ObjectId.isValid(id)) {
      report = await reportsCol.findOne({ _id: new ObjectId(id) });
    }

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      report,
    });

  } catch (err) {
    console.error('GET_SOCIAL_REPORT_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/social-audit/[id]
 * Delete a social audit report
 */
async function DELETEHandler(req, { params }) {
  try {
    const admin = await requireAdminApi(req);
    const { id } = params;

    const db = await getDb();
    const reportsCol = db.collection('social_reports');
    const auditCol = db.collection('auditlogs');

    let result;
    
    // Try to delete by reportId first, then by _id
    result = await reportsCol.deleteOne({ reportId: id });
    
    if (result.deletedCount === 0 && ObjectId.isValid(id)) {
      result = await reportsCol.deleteOne({ _id: new ObjectId(id) });
    }

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Log audit event
    await auditCol.insertOne({
      action: 'social_report_deleted',
      category: 'social_audit',
      actorId: new ObjectId(admin.id),
      actorName: admin.fullName || admin.email,
      details: { reportId: id },
      createdAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      message: 'Report deleted successfully',
    });

  } catch (err) {
    console.error('DELETE_SOCIAL_REPORT_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const DELETE = withErrorLogging(DELETEHandler);
