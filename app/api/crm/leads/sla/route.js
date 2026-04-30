import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import Lead from '@/models/Lead';
import { requireAuthApi } from '@/lib/auth/server';
import { resolveTenantId } from '@/lib/tenant/tenantMiddleware';

// GET /api/crm/leads/sla - Get SLA statistics
async function GETHandler(request) {
  try {
    const user = await requireAuthApi(request);
    await connectMongo();
    const tenantId = await resolveTenantId(user, request);
    
    const now = new Date();

    // Get leads with pending SLA that are overdue
    const overdueLeads = await Lead.find({
      tenantId,
      slaStatus: 'pending',
      slaDeadline: { $lt: now },
    })
      .populate('assignedTo', 'fullName email')
      .sort({ slaDeadline: 1 })
      .limit(50)
      .lean();

    // Get leads approaching SLA deadline (within 1 hour)
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const approachingDeadline = await Lead.find({
      tenantId,
      slaStatus: 'pending',
      slaDeadline: { $gte: now, $lte: oneHourFromNow },
    })
      .populate('assignedTo', 'fullName email')
      .sort({ slaDeadline: 1 })
      .limit(50)
      .lean();

    // Get SLA statistics
    const [totalPending, totalMet, totalBreached] = await Promise.all([
      Lead.countDocuments({ tenantId, slaStatus: 'pending' }),
      Lead.countDocuments({ tenantId, slaStatus: 'met' }),
      Lead.countDocuments({ tenantId, slaStatus: 'breached' }),
    ]);

    // Get snoozed leads that should be un-snoozed
    const snoozedExpired = await Lead.find({
      tenantId,
      snoozedUntil: { $lt: now },
      status: { $nin: ['converted', 'lost'] },
    })
      .populate('assignedTo', 'fullName email')
      .limit(20)
      .lean();

    // Update expired snoozes - clear snoozedUntil
    if (snoozedExpired.length > 0) {
      await Lead.updateMany(
        { _id: { $in: snoozedExpired.map(l => l._id) } },
        { $unset: { snoozedUntil: 1 } }
      );
    }

    // Mark overdue SLAs as breached
    const breachedUpdate = await Lead.updateMany(
      { tenantId, slaStatus: 'pending', slaDeadline: { $lt: now } },
      { $set: { slaStatus: 'breached' } }
    );

    return NextResponse.json({
      stats: {
        pending: totalPending,
        met: totalMet,
        breached: totalBreached + breachedUpdate.modifiedCount,
      },
      overdueLeads,
      approachingDeadline,
      snoozedExpired,
    });
  } catch (error) {
    console.error('Error fetching SLA stats:', error);
    return NextResponse.json({ error: 'Failed to fetch SLA stats' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
