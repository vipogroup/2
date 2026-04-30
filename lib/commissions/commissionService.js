/**
 * Commission Service
 * ניהול מלא של מחזור חיי העמלות
 */

import dbConnect from '@/lib/dbConnect';
import Order from '@/models/Order';
import User from '@/models/User';

// Commission configuration
const COMMISSION_CONFIG = {
  holdDays: parseInt(process.env.COMMISSION_HOLD_DAYS || '14', 10),
  autoRelease: process.env.COMMISSION_AUTO_RELEASE === 'true',
  minWithdrawalAmount: parseInt(process.env.MIN_WITHDRAWAL_AMOUNT || '100', 10),
};

/**
 * Commission Status Lifecycle:
 * 
 * Order Created → Commission Pending (commissionStatus: 'pending')
 *      ↓
 * Payment Success → Commission Confirmed, Hold starts (commissionStatus: 'pending', commissionAvailableAt set)
 *      ↓
 * Hold Period Complete → Commission Available (commissionStatus: 'available')
 *      ↓
 * Agent Requests Withdrawal → Commission Claimed (commissionStatus: 'claimed')
 *      ↓
 * Admin Approves & Pays → Commission Paid (handled via WithdrawalRequest)
 * 
 * Exceptions:
 * - Partial Refund → Commission Reduced proportionally
 * - Full Refund → Commission Cancelled (commissionStatus: 'cancelled')
 * - Chargeback → Commission Cancelled + Agent notified
 */

/**
 * Calculate commission for an order
 * @param {Object} order - Order document
 * @param {Object} agent - Agent user document
 * @returns {Object} Commission calculation result
 */
export async function calculateCommission(order, agent) {
  if (!agent || !order) {
    return { amount: 0, breakdown: [], error: 'Missing order or agent' };
  }

  // Get commission rate from agent or default
  const commissionRate = agent.commissionPercent || 12; // Default 12%
  
  let baseAmount = 0;
  const breakdown = [];

  // Calculate commission for each item
  for (const item of (order.items || [])) {
    const itemPrice = Number(item.price || 0) * Number(item.quantity || 1);
    const itemCommission = itemPrice * (commissionRate / 100);
    
    baseAmount += itemCommission;
    breakdown.push({
      productId: item.productId,
      productName: item.name || item.productName,
      price: itemPrice,
      rate: commissionRate,
      amount: itemCommission,
    });
  }

  // Apply any bonuses (can be extended)
  let bonusAmount = 0;
  // TODO: Evaluate bonus rules from BonusRule model

  const totalAmount = baseAmount + bonusAmount;
  const availableAt = new Date(Date.now() + COMMISSION_CONFIG.holdDays * 24 * 60 * 60 * 1000);

  return {
    baseAmount,
    bonusAmount,
    totalAmount,
    rate: commissionRate,
    holdDays: COMMISSION_CONFIG.holdDays,
    availableAt,
    breakdown,
  };
}

/**
 * Credit commission to agent on payment success
 * @param {Object} order - Order document
 * @param {string} eventType - Payment event type
 */
export async function processCommissionOnPayment(order, eventType) {
  await dbConnect();

  if (!order?.refAgentId || !order?.commissionAmount || order.commissionAmount <= 0) {
    return { processed: false, reason: 'no_commission' };
  }

  const agent = await User.findById(order.refAgentId);
  if (!agent) {
    return { processed: false, reason: 'agent_not_found' };
  }

  const availableAt = new Date(Date.now() + COMMISSION_CONFIG.holdDays * 24 * 60 * 60 * 1000);

  if (eventType === 'success') {
    // Credit commission with hold period
    await User.updateOne(
      { _id: order.refAgentId },
      {
        $inc: {
          commissionBalance: Number(order.commissionAmount),
          totalSales: Number(order.totalAmount),
        },
        $set: { updatedAt: new Date() },
      }
    );

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          commissionStatus: 'pending',
          commissionAvailableAt: availableAt,
          commissionSettled: true,
        },
      }
    );

    return { 
      processed: true, 
      credited: true,
      amount: order.commissionAmount,
      availableAt,
    };

  } else if (['refund', 'partial_refund', 'chargeback'].includes(eventType)) {
    // Handle refund/chargeback
    return await cancelCommission(order, eventType);
  }

  return { processed: false, reason: 'unknown_event' };
}

/**
 * Cancel or reduce commission on refund/chargeback
 */
export async function cancelCommission(order, reason) {
  await dbConnect();

  if (!order?.refAgentId || !order?.commissionAmount) {
    return { processed: false, reason: 'no_commission' };
  }

  const isPartial = reason === 'partial_refund';
  const refundAmount = isPartial 
    ? (order.commissionAmount * (order.refundAmount / order.totalAmount))
    : order.commissionAmount;

  // Deduct from agent's balance
  await User.updateOne(
    { _id: order.refAgentId },
    {
      $inc: { commissionBalance: -Math.abs(refundAmount) },
      $set: { updatedAt: new Date() },
    }
  );

  // Update order
  await Order.updateOne(
    { _id: order._id },
    {
      $set: {
        commissionStatus: isPartial ? 'pending' : 'cancelled',
        commissionSettled: !isPartial,
      },
      $inc: isPartial ? { commissionAmount: -refundAmount } : {},
    }
  );

  // TODO: Create notification for agent

  return {
    processed: true,
    cancelled: !isPartial,
    reduced: isPartial,
    amount: refundAmount,
    reason,
  };
}

/**
 * Release available commissions (run daily via cron)
 */
export async function releaseAvailableCommissions() {
  await dbConnect();

  const now = new Date();
  
  // Find orders with commissions ready to release
  const ordersToRelease = await Order.find({
    commissionStatus: 'pending',
    commissionAvailableAt: { $lte: now },
    commissionSettled: true,
    commissionAmount: { $gt: 0 },
  });

  let released = 0;
  let errors = 0;

  for (const order of ordersToRelease) {
    try {
      await Order.updateOne(
        { _id: order._id },
        { $set: { commissionStatus: 'available' } }
      );
      released++;
    } catch (err) {
      console.error(`[COMMISSION_RELEASE] Failed for order ${order._id}:`, err.message);
      errors++;
    }
  }

  return { released, errors, total: ordersToRelease.length };
}

/**
 * Get agent commission summary
 */
export async function getAgentCommissionSummary(agentId) {
  await dbConnect();

  const agent = await User.findById(agentId);
  if (!agent) {
    return null;
  }

  // Get pending commissions (in hold period)
  const pendingOrders = await Order.find({
    refAgentId: agentId,
    commissionStatus: 'pending',
    commissionSettled: true,
  });

  const pendingAmount = pendingOrders.reduce((sum, o) => sum + (o.commissionAmount || 0), 0);
  const nextAvailableDate = pendingOrders.length > 0
    ? pendingOrders.reduce((min, o) => 
        o.commissionAvailableAt < min ? o.commissionAvailableAt : min,
        pendingOrders[0].commissionAvailableAt
      )
    : null;

  // Get available commissions
  const availableOrders = await Order.find({
    refAgentId: agentId,
    commissionStatus: 'available',
  });
  const availableAmount = availableOrders.reduce((sum, o) => sum + (o.commissionAmount || 0), 0);

  return {
    agentId,
    balance: agent.commissionBalance || 0,
    onHold: agent.commissionOnHold || 0,
    available: availableAmount,
    pending: pendingAmount,
    nextAvailableDate,
    totalSales: agent.totalSales || 0,
    minWithdrawal: COMMISSION_CONFIG.minWithdrawalAmount,
    canWithdraw: availableAmount >= COMMISSION_CONFIG.minWithdrawalAmount,
  };
}

/**
 * Get commission breakdown for an order
 */
export async function getOrderCommissionDetails(orderId) {
  await dbConnect();

  const order = await Order.findById(orderId).populate('refAgentId', 'fullName email commissionPercent');
  if (!order) {
    return null;
  }

  return {
    orderId: order._id,
    totalAmount: order.totalAmount,
    commissionAmount: order.commissionAmount || 0,
    commissionStatus: order.commissionStatus,
    commissionAvailableAt: order.commissionAvailableAt,
    agent: order.refAgentId ? {
      id: order.refAgentId._id,
      name: order.refAgentId.fullName,
      email: order.refAgentId.email,
      rate: order.refAgentId.commissionPercent || 12,
    } : null,
    items: order.items?.map(item => ({
      name: item.name || item.productName,
      price: item.price,
      quantity: item.quantity,
      commission: (item.price * item.quantity) * ((order.refAgentId?.commissionPercent || 12) / 100),
    })),
  };
}

const commissionService = {
  calculateCommission,
  processCommissionOnPayment,
  cancelCommission,
  releaseAvailableCommissions,
  getAgentCommissionSummary,
  getOrderCommissionDetails,
  COMMISSION_CONFIG,
};

export default commissionService;
