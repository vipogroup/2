/**
 * Admin API - Release Commissions
 * POST /api/admin/commissions/release - שחרור עמלות ידני
 */

import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import dbConnect from '@/lib/dbConnect';
import Order from '@/models/Order';
import { releaseAvailableCommissions } from '@/lib/commissions/commissionService';

async function POSTHandler(req) {
  try {
    await requireAdminApi(req);

    await dbConnect();

    const { action, orderId } = await req.json();

    if (action === 'release_all') {
      // Release all available commissions
      const result = await releaseAvailableCommissions();
      return NextResponse.json({
        ok: true,
        message: `Released ${result.released} commissions`,
        ...result,
      });
    }

    if (action === 'release_single' && orderId) {
      // Release specific order commission
      const order = await Order.findById(orderId);
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      if (order.commissionStatus !== 'pending') {
        return NextResponse.json({ 
          error: `Cannot release commission with status: ${order.commissionStatus}` 
        }, { status: 400 });
      }

      // Get agent ID
      const agentId = order.refAgentId || order.agentId;
      if (!agentId) {
        return NextResponse.json({ error: 'No agent found for this order' }, { status: 400 });
      }

      // Update order status
      order.commissionStatus = 'available';
      order.commissionAvailableAt = new Date();
      order.commissionSettled = true;
      await order.save();

      // Add commission to agent's balance
      const User = (await import('@/models/User')).default;
      await User.updateOne(
        { _id: agentId },
        { $inc: { commissionBalance: order.commissionAmount } }
      );

      return NextResponse.json({
        ok: true,
        message: 'Commission released',
        orderId: order._id,
        amount: order.commissionAmount,
        agentId: agentId,
      });
    }

    if (action === 'cancel' && orderId) {
      // Cancel commission
      const order = await Order.findById(orderId);
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      if (['cancelled', 'claimed'].includes(order.commissionStatus)) {
        return NextResponse.json({ 
          error: `Cannot cancel commission with status: ${order.commissionStatus}` 
        }, { status: 400 });
      }

      // If commission was credited, need to deduct from agent
      if (order.commissionSettled && order.refAgentId) {
        const User = (await import('@/models/User')).default;
        await User.updateOne(
          { _id: order.refAgentId },
          { $inc: { commissionBalance: -order.commissionAmount } }
        );
      }

      order.commissionStatus = 'cancelled';
      order.commissionSettled = false;
      await order.save();

      return NextResponse.json({
        ok: true,
        message: 'Commission cancelled',
        orderId: order._id,
        amount: order.commissionAmount,
      });
    }

    if (action === 'fix_balance' && orderId) {
      // Fix commission balance for orders that were released before the fix
      const order = await Order.findById(orderId);
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      if (order.commissionStatus !== 'available') {
        return NextResponse.json({ 
          error: `Order commission status is ${order.commissionStatus}, not available` 
        }, { status: 400 });
      }

      const agentId = order.refAgentId || order.agentId;
      if (!agentId) {
        return NextResponse.json({ error: 'No agent found for this order' }, { status: 400 });
      }

      // Check if already settled
      if (order.commissionSettled) {
        return NextResponse.json({ 
          error: 'Commission already settled',
          orderId: order._id,
        }, { status: 400 });
      }

      // Add commission to agent's balance
      const User = (await import('@/models/User')).default;
      await User.updateOne(
        { _id: agentId },
        { $inc: { commissionBalance: order.commissionAmount } }
      );

      // Mark as settled
      order.commissionSettled = true;
      await order.save();

      return NextResponse.json({
        ok: true,
        message: 'Commission balance fixed',
        orderId: order._id,
        amount: order.commissionAmount,
        agentId: agentId,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err) {
    console.error('[ADMIN_COMMISSION_RELEASE]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function GETHandler(req) {
  try {
    await requireAdminApi(req);

    await dbConnect();

    // Get commissions ready for release
    const now = new Date();
    const readyForRelease = await Order.find({
      commissionStatus: 'pending',
      commissionAvailableAt: { $lte: now },
      commissionSettled: true,
      commissionAmount: { $gt: 0 },
    })
      .populate('refAgentId', 'fullName email')
      .sort({ commissionAvailableAt: 1 })
      .lean();

    // Get commissions still in hold
    const inHold = await Order.find({
      commissionStatus: 'pending',
      commissionAvailableAt: { $gt: now },
      commissionSettled: true,
      commissionAmount: { $gt: 0 },
    })
      .populate('refAgentId', 'fullName email')
      .sort({ commissionAvailableAt: 1 })
      .lean();

    return NextResponse.json({
      ok: true,
      readyForRelease: {
        count: readyForRelease.length,
        totalAmount: readyForRelease.reduce((sum, o) => sum + (o.commissionAmount || 0), 0),
        items: readyForRelease.map(o => ({
          orderId: o._id,
          amount: o.commissionAmount,
          agent: o.refAgentId?.fullName,
          availableSince: o.commissionAvailableAt,
        })),
      },
      inHold: {
        count: inHold.length,
        totalAmount: inHold.reduce((sum, o) => sum + (o.commissionAmount || 0), 0),
        items: inHold.slice(0, 20).map(o => ({
          orderId: o._id,
          amount: o.commissionAmount,
          agent: o.refAgentId?.fullName,
          availableAt: o.commissionAvailableAt,
        })),
      },
    });

  } catch (err) {
    console.error('[ADMIN_COMMISSION_RELEASE_GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
export const GET = withErrorLogging(GETHandler);
