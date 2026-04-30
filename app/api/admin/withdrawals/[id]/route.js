import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';
import { processWithdrawalViaPriority, completeWithdrawal } from '@/lib/priority/agentPayoutService.js';
import { isPriorityConfigured } from '@/lib/priority/client.js';
import { sendTemplateNotification } from '@/lib/notifications/dispatcher';
import { isSuperAdmin } from '@/lib/tenant/tenantMiddleware';
import { assertTestHarnessAccess, isTestHarnessEnabled } from '@/lib/testHarness/gate';
import { apiDebugLog } from '@/lib/apiDebugLog';

const ACTIONS = ['approve', 'reject', 'complete', 'pay_via_priority', 'delete'];

function invalidIdResponse() {
  return NextResponse.json({ error: 'Invalid withdrawal id' }, { status: 400 });
}

function normalizeNotes(notes) {
  if (!notes) return '';
  if (typeof notes !== 'string') return '';
  return notes.trim();
}

function mapWithdrawal(doc, user) {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    amount: doc.amount,
    status: doc.status,
    notes: doc.notes ?? '',
    adminNotes: doc.adminNotes ?? '',
    paymentDetails: doc.paymentDetails || null,
    snapshotBalance: doc.snapshotBalance ?? 0,
    snapshotOnHold: doc.snapshotOnHold ?? 0,
    processedBy: doc.processedBy ? String(doc.processedBy) : null,
    processedAt: doc.processedAt || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    user,
  };
}

async function GETHandler(req, { params }, { requestId } = {}) {
  try {
    const { id } = params || {};
    if (!id || !ObjectId.isValid(id)) {
      return invalidIdResponse();
    }

    const db = await getDb();
    let admin = await requireAdminApi(req);

    if (isTestHarnessEnabled() && req.headers.get('x-test-role') === 'business_admin') {
      try {
        assertTestHarnessAccess({ user: admin, requestId, source: 'api/admin/withdrawals/[id]' });
        admin = { ...admin, role: 'business_admin' };
      } catch (_err) {
      }
    }
    const isBusinessAdmin = admin.role === 'business_admin';
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const withdrawalId = new ObjectId(id);
    const withdrawals = db.collection('withdrawalRequests');
    const users = db.collection('users');

    const doc = await withdrawals.findOne({ _id: withdrawalId });
    if (!doc) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    }

    if (isBusinessAdmin) {
      const withdrawalTenantId = doc.tenantId?.toString();
      if (!withdrawalTenantId) {
        return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
      }
    }
    
    // Multi-Tenant: Verify withdrawal belongs to admin's tenant
    if (!isSuperAdmin(admin) && admin.tenantId) {
      const withdrawalTenantId = doc.tenantId?.toString();
      const adminTenantId = admin.tenantId?.toString();
      if (withdrawalTenantId && withdrawalTenantId !== adminTenantId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const userDoc = await users
      .find({ _id: doc.userId })
      .project({ fullName: 1, email: 1, phone: 1, role: 1, commissionBalance: 1, commissionOnHold: 1 })
      .limit(1)
      .toArray();

    const user = userDoc[0]
      ? {
          id: String(userDoc[0]._id),
          fullName: userDoc[0].fullName || '',
          email: userDoc[0].email || '',
          phone: userDoc[0].phone || '',
          role: userDoc[0].role || 'agent',
          commissionBalance: userDoc[0].commissionBalance || 0,
          commissionOnHold: userDoc[0].commissionOnHold || 0,
        }
      : null;

    return NextResponse.json({ ok: true, withdrawal: mapWithdrawal(doc, user) });
  } catch (err) {
    console.error('ADMIN_WITHDRAWAL_GET_ERROR:', err);
    const status = err?.status || 500;
    const message = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Server error';
    return NextResponse.json({ error: message }, { status });
  }
}

async function PATCHHandler(req, { params }, { requestId } = {}) {
  try {
    const { id } = params || {};
    if (!id || !ObjectId.isValid(id)) {
      return invalidIdResponse();
    }

    const body = await req.json();
    const action = body?.action;
    const adminNotes = normalizeNotes(body?.adminNotes);

    if (!ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const db = await getDb();
    let admin = await requireAdminApi(req);

    if (isTestHarnessEnabled() && req.headers.get('x-test-role') === 'business_admin') {
      try {
        assertTestHarnessAccess({ user: admin, requestId, source: 'api/admin/withdrawals/[id]' });
        admin = { ...admin, role: 'business_admin' };
      } catch (_err) {
      }
    }
    const isBusinessAdmin = admin.role === 'business_admin';
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const adminId = new ObjectId(admin.id);
    const withdrawalId = new ObjectId(id);
    const withdrawals = db.collection('withdrawalRequests');
    const users = db.collection('users');

    const existing = await withdrawals.findOne({ _id: withdrawalId });
    if (!existing) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    }

    if (isBusinessAdmin) {
      if (!existing?.tenantId) {
        return NextResponse.json(
          { error: 'Forbidden: withdrawal has no tenantId' },
          { status: 403 },
        );
      }

      return NextResponse.json(
        { error: 'Forbidden: business_admin cannot perform withdrawal actions' },
        { status: 403 },
      );
    }
    
    // Multi-Tenant: Verify withdrawal belongs to admin's tenant
    if (!isSuperAdmin(admin) && admin.tenantId) {
      const withdrawalTenantId = existing.tenantId?.toString();
      const adminTenantId = admin.tenantId?.toString();
      if (withdrawalTenantId && withdrawalTenantId !== adminTenantId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const now = new Date();
    let updatedDoc = null;

    if (action === 'approve') {
      if (existing.status !== 'pending') {
        return NextResponse.json({ error: 'Cannot approve in current status' }, { status: 409 });
      }

      const result = await withdrawals.findOneAndUpdate(
        { _id: withdrawalId, status: 'pending' },
        {
          $set: {
            status: 'approved',
            adminNotes,
            processedBy: adminId,
            processedAt: now,
            updatedAt: now,
          },
        },
        { returnDocument: 'after' },
      );
      
      // Handle both old (.value) and new (direct) MongoDB driver response formats
      const approvedDoc = result?.value || result;
      
      if (!approvedDoc || !approvedDoc._id) {
        return NextResponse.json({ error: 'Withdrawal already processed' }, { status: 409 });
      }
      updatedDoc = approvedDoc;

      // Send notification to agent
      try {
        await sendTemplateNotification({
          templateType: 'withdrawal_approved',
          variables: { amount: approvedDoc.amount },
          audienceUserIds: [String(approvedDoc.userId)],
        });
      } catch (notifErr) {
        console.error('WITHDRAWAL_APPROVED_NOTIFICATION_ERROR:', notifErr?.message);
      }
    }

    if (action === 'reject') {
      if (existing.status === 'completed' || existing.status === 'rejected') {
        return NextResponse.json({ error: 'Withdrawal already finalized' }, { status: 409 });
      }

      // Update withdrawal status (no transaction - works with standalone MongoDB)
      const rejectResult = await withdrawals.findOneAndUpdate(
        { _id: withdrawalId, status: { $in: ['pending', 'approved'] } },
        {
          $set: {
            status: 'rejected',
            adminNotes,
            processedBy: adminId,
            processedAt: now,
            updatedAt: now,
          },
        },
        { returnDocument: 'after' },
      );

      // Handle both old (.value) and new (direct) MongoDB driver response formats
      const rejectedDoc = rejectResult?.value || rejectResult;
      
      if (!rejectedDoc || !rejectedDoc._id) {
        return NextResponse.json({ error: 'Withdrawal already processed' }, { status: 409 });
      }

      // Revert funds to user's balance
      const revertResult = await users.findOneAndUpdate(
        { _id: rejectedDoc.userId },
        {
          $inc: {
            commissionBalance: rejectedDoc.amount,
            commissionOnHold: -rejectedDoc.amount,
          },
          $set: { updatedAt: now },
        },
        { returnDocument: 'after' },
      );

      const revertedUser = revertResult?.value || revertResult;
      if (!revertedUser || !revertedUser._id) {
        console.error('ADMIN_WITHDRAWAL_REJECT_USER_NOT_FOUND:', { userId: rejectedDoc.userId });
      }

      // Send notification to agent about rejection
      try {
        await sendTemplateNotification({
          templateType: 'withdrawal_rejected',
          variables: { 
            amount: rejectedDoc.amount,
            reason: adminNotes || 'לא צוינה סיבה',
          },
          audienceUserIds: [String(rejectedDoc.userId)],
        });
      } catch (notifErr) {
        console.error('WITHDRAWAL_REJECTED_NOTIFICATION_ERROR:', notifErr?.message);
      }

      updatedDoc = rejectedDoc;
    }

    if (action === 'complete') {
      if (existing.status !== 'approved') {
        return NextResponse.json({ error: 'Only approved withdrawals can be completed' }, { status: 409 });
      }

      // Update withdrawal status (no transaction - works with standalone MongoDB)
      const completeResult = await withdrawals.findOneAndUpdate(
        { _id: withdrawalId, status: 'approved' },
        {
          $set: {
            status: 'completed',
            adminNotes,
            processedBy: adminId,
            processedAt: now,
            updatedAt: now,
          },
        },
        { returnDocument: 'after' },
      );

      // Handle both old (.value) and new (direct) MongoDB driver response formats
      const completedDoc = completeResult?.value || completeResult;
      
      if (!completedDoc || !completedDoc._id) {
        return NextResponse.json({ error: 'Withdrawal already processed' }, { status: 409 });
      }

      // Decrease user's onHold amount
      const decResult = await users.findOneAndUpdate(
        { _id: completedDoc.userId },
        {
          $inc: {
            commissionOnHold: -completedDoc.amount,
          },
          $set: { updatedAt: now },
        },
        { returnDocument: 'after' },
      );

      const updatedUser = decResult?.value || decResult;
      if (!updatedUser || !updatedUser._id) {
        console.error('ADMIN_WITHDRAWAL_COMPLETE_USER_NOT_FOUND:', { userId: completedDoc.userId });
      }

      // Note: We no longer mark orders as 'claimed' because the available balance
      // is now calculated by subtracting completed withdrawals from available commissions.
      // This prevents double-counting issues.

      apiDebugLog('ADMIN_WITHDRAWAL_COMPLETE:', {
        userId: completedDoc.userId.toString(),
        withdrawalAmount: completedDoc.amount,
      });

      // Send notification to agent about completed transfer
      try {
        await sendTemplateNotification({
          templateType: 'withdrawal_completed',
          variables: { amount: completedDoc.amount },
          audienceUserIds: [String(completedDoc.userId)],
        });
      } catch (notifErr) {
        console.error('WITHDRAWAL_COMPLETED_NOTIFICATION_ERROR:', notifErr?.message);
      }

      updatedDoc = completedDoc;
    }

    // === Pay via Priority ERP ===
    if (action === 'pay_via_priority') {
      if (!isPriorityConfigured()) {
        return NextResponse.json({ error: 'Priority ERP לא מוגדר במערכת' }, { status: 400 });
      }

      if (existing.status !== 'approved') {
        return NextResponse.json({ error: 'רק בקשות מאושרות ניתנות לתשלום' }, { status: 409 });
      }

      // Process payment via Priority
      const paymentResult = await processWithdrawalViaPriority(id);
      
      if (!paymentResult.success) {
        return NextResponse.json({ 
          error: `שגיאה ביצירת תשלום Priority: ${paymentResult.reason}` 
        }, { status: 500 });
      }

      // Get updated withdrawal
      updatedDoc = await withdrawals.findOne({ _id: withdrawalId });

      return NextResponse.json({ 
        ok: true, 
        message: 'מסמך תשלום נוצר בהצלחה ב-Priority',
        priorityPaymentId: paymentResult.paymentId,
        withdrawal: mapWithdrawal(updatedDoc, null)
      });
    }

    // === Delete withdrawal request ===
    if (action === 'delete') {
      // Only completed withdrawals cannot be deleted (money already transferred)
      if (existing.status === 'completed') {
        return NextResponse.json({ 
          error: 'לא ניתן למחוק בקשה שהושלמה - הכסף כבר הועבר' 
        }, { status: 409 });
      }

      // If pending or approved, revert funds back to user's balance
      if (['pending', 'approved'].includes(existing.status)) {
        const revertResult = await users.findOneAndUpdate(
          { _id: existing.userId },
          {
            $inc: {
              commissionBalance: existing.amount,
              commissionOnHold: -existing.amount,
            },
            $set: { updatedAt: now },
          },
          { returnDocument: 'after' },
        );

        const revertedUser = revertResult?.value || revertResult;
        if (!revertedUser || !revertedUser._id) {
          console.error('ADMIN_WITHDRAWAL_DELETE_USER_NOT_FOUND:', { userId: existing.userId });
        }
      }

      // Delete the withdrawal request
      const deleteResult = await withdrawals.deleteOne({ _id: withdrawalId });
      
      if (deleteResult.deletedCount === 0) {
        return NextResponse.json({ error: 'לא ניתן למחוק את הבקשה' }, { status: 500 });
      }

      apiDebugLog('ADMIN_WITHDRAWAL_DELETED', {
        withdrawalId: id,
        userId: String(existing.userId),
        amount: existing.amount,
        previousStatus: existing.status,
        deletedBy: admin.id
      });

      return NextResponse.json({ 
        ok: true, 
        message: 'בקשת המשיכה נמחקה בהצלחה',
        deleted: true
      });
    }

    const usersCollection = db.collection('users');
    const userDoc = await usersCollection
      .find({ _id: updatedDoc.userId })
      .project({ fullName: 1, email: 1, phone: 1, role: 1, commissionBalance: 1, commissionOnHold: 1 })
      .limit(1)
      .toArray();

    const user = userDoc[0]
      ? {
          id: String(userDoc[0]._id),
          fullName: userDoc[0].fullName || '',
          email: userDoc[0].email || '',
          phone: userDoc[0].phone || '',
          role: userDoc[0].role || 'agent',
          commissionBalance: userDoc[0].commissionBalance || 0,
          commissionOnHold: userDoc[0].commissionOnHold || 0,
        }
      : null;

    return NextResponse.json({ ok: true, withdrawal: mapWithdrawal(updatedDoc, user) });
  } catch (err) {
    console.error('ADMIN_WITHDRAWAL_PATCH_ERROR:', err);
    const status = err?.status || 500;
    const message = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Server error';
    return NextResponse.json({ error: message }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
export const PATCH = withErrorLogging(PATCHHandler);
