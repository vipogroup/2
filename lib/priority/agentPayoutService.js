/**
 * Agent Payout Service - Priority Integration
 * 
 * מנהל את תהליך תשלום עמלות לסוכנים דרך Priority ERP
 * - סנכרון סוכן כספק ב-Priority
 * - יצירת מסמך תשלום (FNCTRANS)
 * - מעקב סטטוס תשלום
 */

import { getPriorityClient, isPriorityConfigured } from './client.js';
import { getDb } from '../db.js';
import { ObjectId } from 'mongodb';

/**
 * Sync agent as supplier in Priority
 * Creates or updates supplier record for the agent
 * @param {string} agentId - MongoDB User ID
 * @returns {Object} - { synced, supplierId, isNew, error }
 */
export async function syncAgentAsSupplier(agentId) {
  if (!isPriorityConfigured()) {
    console.warn('[AGENT_PAYOUT] Priority not configured');
    return { synced: false, reason: 'priority_not_configured' };
  }

  const priority = getPriorityClient();
  if (!priority) {
    return { synced: false, reason: 'client_unavailable' };
  }

  try {
    const db = await getDb();
    const usersCol = db.collection('users');
    
    // Get agent data
    const agent = await usersCol.findOne({ 
      _id: new ObjectId(agentId),
      role: 'agent'
    });

    if (!agent) {
      return { synced: false, reason: 'agent_not_found' };
    }

    // Check if agent already has Priority supplier ID
    if (agent.prioritySupplierId) {
      // Verify it exists in Priority
      const existingSupplier = await priority.findSupplier({ 
        supplierId: agent.prioritySupplierId 
      });
      
      if (existingSupplier) {
        // Update supplier with latest agent info
        await priority.updateSupplier(agent.prioritySupplierId, {
          name: agent.fullName,
          email: agent.email,
          phone: agent.phone,
          bankDetails: agent.bankDetails,
        });
        
        return {
          synced: true,
          supplierId: agent.prioritySupplierId,
          isNew: false,
        };
      }
    }

    // Try to find existing supplier by email/phone
    const existingSupplier = await priority.findSupplier({
      email: agent.email,
      phone: agent.phone,
      vatId: agent.vatId,
    });

    if (existingSupplier) {
      // Link existing supplier to agent
      await usersCol.updateOne(
        { _id: agent._id },
        { 
          $set: { 
            prioritySupplierId: existingSupplier.SUPNAME,
            updatedAt: new Date()
          } 
        }
      );
      
      return {
        synced: true,
        supplierId: existingSupplier.SUPNAME,
        isNew: false,
      };
    }

    // Create new supplier
    const supplierData = {
      supplierId: `AGT-${agent._id.toString().slice(-8).toUpperCase()}`,
      name: agent.fullName || 'סוכן',
      email: agent.email,
      phone: agent.phone,
      vatId: agent.vatId || null,
      address: agent.address || agent.shippingAddress,
      city: agent.city || agent.shippingCity,
      zipCode: agent.zipCode || agent.shippingZipCode,
      bankDetails: agent.bankDetails,
    };

    const newSupplier = await priority.createSupplier(supplierData);

    // Save Priority supplier ID to agent
    await usersCol.updateOne(
      { _id: agent._id },
      { 
        $set: { 
          prioritySupplierId: newSupplier.id,
          updatedAt: new Date()
        } 
      }
    );

    console.log(`[AGENT_PAYOUT] Created supplier ${newSupplier.id} for agent ${agentId}`);

    return {
      synced: true,
      supplierId: newSupplier.id,
      isNew: true,
    };

  } catch (err) {
    console.error('[AGENT_PAYOUT] Supplier sync failed:', err.message);
    return {
      synced: false,
      reason: err.message,
      error: err,
    };
  }
}

/**
 * Process withdrawal request via Priority
 * Creates a payment document (FNCTRANS) in Priority
 * @param {string} withdrawalId - WithdrawalRequest MongoDB ID
 * @returns {Object} - { success, paymentId, error }
 */
export async function processWithdrawalViaPriority(withdrawalId) {
  if (!isPriorityConfigured()) {
    return { success: false, reason: 'priority_not_configured' };
  }

  const priority = getPriorityClient();
  if (!priority) {
    return { success: false, reason: 'client_unavailable' };
  }

  try {
    const db = await getDb();
    const withdrawalsCol = db.collection('withdrawalrequests');
    const usersCol = db.collection('users');

    // Get withdrawal request
    const withdrawal = await withdrawalsCol.findOne({ 
      _id: new ObjectId(withdrawalId) 
    });

    if (!withdrawal) {
      return { success: false, reason: 'withdrawal_not_found' };
    }

    if (withdrawal.status !== 'approved') {
      return { success: false, reason: 'withdrawal_not_approved' };
    }

    // Get agent
    const agent = await usersCol.findOne({ _id: withdrawal.userId });
    if (!agent) {
      return { success: false, reason: 'agent_not_found' };
    }

    // Ensure agent is synced as supplier
    let supplierId = agent.prioritySupplierId;
    if (!supplierId) {
      const syncResult = await syncAgentAsSupplier(agent._id.toString());
      if (!syncResult.synced) {
        return { success: false, reason: 'supplier_sync_failed', error: syncResult.reason };
      }
      supplierId = syncResult.supplierId;
    }

    // Create payment in Priority
    const paymentData = {
      supplierId: supplierId,
      amount: withdrawal.amount,
      paymentDate: new Date(),
      description: `תשלום עמלה - בקשת משיכה ${withdrawalId}`,
      reference: `WD-${withdrawalId}`,
      externalRef: withdrawal._id.toString(),
      paymentMethod: mapPaymentMethod(withdrawal.paymentMethod),
      bankAccount: withdrawal.bankDetails?.accountNumber,
    };

    const payment = await priority.createSupplierPayment(paymentData);

    // Update withdrawal request with Priority payment ID
    await withdrawalsCol.updateOne(
      { _id: withdrawal._id },
      {
        $set: {
          status: 'processing',
          priorityPaymentDocId: payment.id,
          processedAt: new Date(),
          updatedAt: new Date(),
        }
      }
    );

    console.log(`[AGENT_PAYOUT] Created Priority payment ${payment.id} for withdrawal ${withdrawalId}`);

    return {
      success: true,
      paymentId: payment.id,
      payment: payment,
    };

  } catch (err) {
    console.error('[AGENT_PAYOUT] Payment creation failed:', err.message);
    
    // Update withdrawal with error
    try {
      const db = await getDb();
      await db.collection('withdrawalrequests').updateOne(
        { _id: new ObjectId(withdrawalId) },
        {
          $set: {
            adminNotes: `שגיאה ביצירת תשלום Priority: ${err.message}`,
            updatedAt: new Date(),
          }
        }
      );
    } catch (updateErr) {
      console.error('[AGENT_PAYOUT] Failed to update withdrawal error:', updateErr);
    }

    return {
      success: false,
      reason: err.message,
      error: err,
    };
  }
}

/**
 * Check payment status in Priority
 * @param {string} paymentId - Priority payment document ID
 * @returns {Object} - Payment status info
 */
export async function checkPaymentStatus(paymentId) {
  if (!isPriorityConfigured()) {
    return { success: false, reason: 'priority_not_configured' };
  }

  const priority = getPriorityClient();
  if (!priority) {
    return { success: false, reason: 'client_unavailable' };
  }

  try {
    const payment = await priority.getSupplierPayment(paymentId);
    
    return {
      success: true,
      paymentId: paymentId,
      status: payment.STATDES || 'unknown',
      amount: payment.QPRICE,
      date: payment.CURDATE,
      details: payment,
    };
  } catch (err) {
    return {
      success: false,
      reason: err.message,
      error: err,
    };
  }
}

/**
 * Complete withdrawal after Priority payment confirmed
 * @param {string} withdrawalId - MongoDB withdrawal request ID
 */
export async function completeWithdrawal(withdrawalId) {
  try {
    const db = await getDb();
    const withdrawalsCol = db.collection('withdrawalrequests');
    const usersCol = db.collection('users');

    const withdrawal = await withdrawalsCol.findOne({ 
      _id: new ObjectId(withdrawalId) 
    });

    if (!withdrawal) {
      return { success: false, reason: 'withdrawal_not_found' };
    }

    // Update withdrawal status
    await withdrawalsCol.updateOne(
      { _id: withdrawal._id },
      {
        $set: {
          status: 'completed',
          paidAt: new Date(),
          updatedAt: new Date(),
        }
      }
    );

    // Deduct from agent's commission balance
    await usersCol.updateOne(
      { _id: withdrawal.userId },
      {
        $inc: {
          commissionBalance: -withdrawal.amount,
        },
        $set: {
          updatedAt: new Date(),
        }
      }
    );

    console.log(`[AGENT_PAYOUT] Completed withdrawal ${withdrawalId}`);

    return { success: true };

  } catch (err) {
    console.error('[AGENT_PAYOUT] Complete withdrawal failed:', err.message);
    return { success: false, reason: err.message, error: err };
  }
}

// ========== Helper Functions ==========

/**
 * Map internal payment method to Priority code
 */
function mapPaymentMethod(method) {
  const methodMap = {
    'bank_transfer': 'BT',
    'bit': 'BT',
    'paypal': 'PP',
    'check': 'CK',
  };
  return methodMap[method] || 'BT';
}

const agentPayoutService = {
  syncAgentAsSupplier,
  processWithdrawalViaPriority,
  checkPaymentStatus,
  completeWithdrawal,
};

export default agentPayoutService;
