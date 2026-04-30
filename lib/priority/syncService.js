/**
 * Priority Sync Service
 * מנהל את הסנכרון בין VIPO לפריוריטי
 */

import { getPriorityClient, isPriorityConfigured } from './client.js';
import { mapPaymentMethodToPriority } from './config.js';

/**
 * Sync customer to Priority
 * @param {Object} user - User document from MongoDB
 * @param {Object} order - Order document (optional, for address info)
 */
export async function syncCustomerToPriority(user, order = null) {
  if (!isPriorityConfigured()) {
    console.warn('[PRIORITY_SYNC] Priority not configured, skipping customer sync');
    return { synced: false, reason: 'not_configured' };
  }

  const priority = getPriorityClient();
  if (!priority) {
    return { synced: false, reason: 'client_unavailable' };
  }

  try {
    // Check if customer already exists
    let priorityCustomer = await priority.findCustomer({
      email: user.email,
      phone: user.phone,
      vatId: user.vatId,
    });

    if (priorityCustomer) {
      // Customer exists, return existing ID
      return {
        synced: true,
        customerId: priorityCustomer.CUSTNAME,
        isNew: false,
      };
    }

    // Create new customer
    const customerData = {
      name: user.fullName || user.companyName || 'לקוח אינטרנט',
      email: user.email,
      phone: user.phone,
      vatId: user.vatId || null,
      address: order?.customer?.address || user.shippingAddress || '',
      city: order?.customer?.city || user.shippingCity || '',
      zipCode: order?.customer?.zipCode || user.shippingZipCode || '',
      country: 'IL',
    };

    priorityCustomer = await priority.createCustomer(customerData);

    return {
      synced: true,
      customerId: priorityCustomer.id,
      isNew: true,
    };
  } catch (err) {
    console.error('[PRIORITY_SYNC] Customer sync failed:', err.message);
    return {
      synced: false,
      reason: err.message,
      error: err,
    };
  }
}

/**
 * Create Priority documents for a paid order
 * @param {Object} order - Order document
 * @param {Object} paymentEvent - Payment event with payment details
 * @param {Object} syncMap - IntegrationSyncMap document
 */
export async function createPriorityDocuments(order, paymentEvent, syncMap) {
  if (!isPriorityConfigured()) {
    console.warn('[PRIORITY_SYNC] Priority not configured, skipping document creation');
    return { synced: false, reason: 'not_configured' };
  }

  const priority = getPriorityClient();
  if (!priority) {
    return { synced: false, reason: 'client_unavailable' };
  }

  const results = {
    customer: null,
    salesOrder: null,
    invoice: null,
    receipt: null,
    errors: [],
  };

  try {
    // 1. Ensure customer exists in Priority
    const User = (await import('../../models/User.js')).default;
    const user = order.createdBy 
      ? await User.findById(order.createdBy)
      : null;

    if (user || order.customer?.email) {
      const customerResult = await syncCustomerToPriority(
        user || { 
          fullName: order.customerName,
          email: order.customer?.email,
          phone: order.customerPhone,
        }, 
        order
      );

      if (customerResult.synced) {
        results.customer = customerResult;
        syncMap.priorityCustomerId = customerResult.customerId;
        await syncMap.updatePriorityCustomerStatus(customerResult.customerId, 'synced');
        
        // Update user with Priority ID if new
        if (user && customerResult.isNew) {
          user.priorityCustomerId = customerResult.customerId;
          user.prioritySyncStatus = 'synced';
          user.lastPrioritySyncAt = new Date();
          await user.save();
        }
      } else {
        results.errors.push({ stage: 'customer', error: customerResult.reason });
        await syncMap.logError('priority', 'createCustomer', 'SYNC_FAILED', customerResult.reason);
      }
    }

    // 2. Create Sales Order (if customer exists)
    if (syncMap.priorityCustomerId && !syncMap.prioritySalesOrderId) {
      try {
        const orderLines = await mapOrderLinesToPriority(order.items);
        
        const salesOrder = await priority.createSalesOrder({
          customerId: syncMap.priorityCustomerId,
          externalRef: order._id.toString(),
          orderDate: order.createdAt,
          notes: `הזמנה מאתר - ${order._id}`,
          lines: orderLines,
        });

        results.salesOrder = salesOrder;
        await syncMap.updatePriorityOrderStatus(salesOrder.id, 'synced');
      } catch (err) {
        results.errors.push({ stage: 'salesOrder', error: err.message });
        await syncMap.logError('priority', 'createSalesOrder', 'SYNC_FAILED', err.message);
      }
    }

    // 3. Create Invoice (on payment success)
    if (syncMap.priorityCustomerId && paymentEvent?.type === 'success' && !syncMap.priorityInvoiceId) {
      try {
        const orderLines = await mapOrderLinesToPriority(order.items);
        
        const invoice = await priority.createInvoice({
          customerId: syncMap.priorityCustomerId,
          fromOrderId: syncMap.prioritySalesOrderId,
          invoiceDate: paymentEvent.processedAt || new Date(),
          payment: {
            method: mapPaymentMethodToPriority(paymentEvent.paymentMethod),
            amount: paymentEvent.amount,
            date: paymentEvent.processedAt || new Date(),
            reference: paymentEvent.transactionId,
          },
          lines: orderLines,
        });

        results.invoice = invoice;
        await syncMap.updatePriorityInvoiceStatus(invoice.id, invoice.number, 'synced');
      } catch (err) {
        results.errors.push({ stage: 'invoice', error: err.message });
        await syncMap.logError('priority', 'createInvoice', 'SYNC_FAILED', err.message);
      }
    }

    // Update overall sync status
    syncMap.orderAmount = order.totalAmount;
    syncMap.payplusAmount = paymentEvent?.amount;
    syncMap.checkAmountMismatch();
    await syncMap.save();

    return {
      synced: results.errors.length === 0,
      results,
      errors: results.errors,
    };

  } catch (err) {
    console.error('[PRIORITY_SYNC] Document creation failed:', err.message);
    await syncMap.logError('priority', 'createDocuments', 'SYNC_FAILED', err.message);
    return {
      synced: false,
      reason: err.message,
      error: err,
      results,
    };
  }
}

/**
 * Create credit note for refund
 * @param {Object} order - Order document
 * @param {Object} refundEvent - Refund payment event
 * @param {Object} syncMap - IntegrationSyncMap document
 */
export async function createCreditNote(order, refundEvent, syncMap) {
  if (!isPriorityConfigured()) {
    return { synced: false, reason: 'not_configured' };
  }

  const priority = getPriorityClient();
  if (!priority || !syncMap.priorityCustomerId) {
    return { synced: false, reason: 'missing_customer' };
  }

  try {
    const isPartial = refundEvent.type === 'partial_refund';
    const refundAmount = refundEvent.amount;

    // Calculate refund lines
    let lines;
    if (isPartial) {
      // For partial refund, create a single line with the refund amount
      lines = [{
        itemCode: 'REFUND',
        quantity: 1,
        price: refundAmount,
        totalPrice: refundAmount,
      }];
    } else {
      // For full refund, use original order lines
      lines = await mapOrderLinesToPriority(order.items);
    }

    const creditNote = await priority.createCreditNote({
      customerId: syncMap.priorityCustomerId,
      originalInvoiceId: syncMap.priorityInvoiceId,
      creditDate: refundEvent.processedAt || new Date(),
      reason: refundEvent.errorMessage || (isPartial ? 'זיכוי חלקי' : 'זיכוי מלא'),
      lines,
    });

    syncMap.priorityCreditNoteId = creditNote.id;
    syncMap.creditNoteNumber = creditNote.number;
    await syncMap.save();

    return {
      synced: true,
      creditNoteId: creditNote.id,
      creditNoteNumber: creditNote.number,
    };

  } catch (err) {
    console.error('[PRIORITY_SYNC] Credit note creation failed:', err.message);
    await syncMap.logError('priority', 'createCreditNote', 'SYNC_FAILED', err.message);
    return {
      synced: false,
      reason: err.message,
      error: err,
    };
  }
}

/**
 * Map order items to Priority line format
 * @param {Array} items - Order items
 */
async function mapOrderLinesToPriority(items) {
  const PriorityProduct = (await import('../../models/PriorityProduct.js')).default;
  
  const lines = [];
  
  for (const item of items) {
    // Try to find mapped Priority item code
    let itemCode = 'WEBITEM'; // Default
    
    if (item.productId) {
      const mapping = await PriorityProduct.getByProductId(item.productId);
      if (mapping) {
        itemCode = mapping.priorityItemCode;
      }
    }

    lines.push({
      itemCode,
      quantity: item.quantity || 1,
      price: item.price || 0,
      totalPrice: (item.price || 0) * (item.quantity || 1),
      discount: item.discount || 0,
    });
  }

  return lines;
}

/**
 * Retry failed syncs
 */
export async function retryFailedSyncs(limit = 50) {
  const IntegrationSyncMap = (await import('../../models/IntegrationSyncMap.js')).default;
  const Order = (await import('../../models/Order.js')).default;
  const PaymentEvent = (await import('../../models/PaymentEvent.js')).default;

  const failedSyncs = await IntegrationSyncMap.find({
    syncStatus: 'failed',
    retryCount: { $lt: 5 },
  }).limit(limit);

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
  };

  for (const syncMap of failedSyncs) {
    results.processed++;
    
    try {
      const order = await Order.findById(syncMap.orderId);
      if (!order) {
        syncMap.syncStatus = 'cancelled';
        await syncMap.save();
        continue;
      }

      const paymentEvent = await PaymentEvent.findOne({
        orderId: syncMap.orderId,
        type: 'success',
        status: 'processed',
      });

      const result = await createPriorityDocuments(order, paymentEvent, syncMap);
      
      if (result.synced) {
        results.succeeded++;
      } else {
        results.failed++;
        syncMap.retryCount++;
        await syncMap.save();
      }
    } catch (err) {
      results.failed++;
      syncMap.retryCount++;
      await syncMap.logError('internal', 'retrySync', 'RETRY_FAILED', err.message);
    }
  }

  return results;
}
