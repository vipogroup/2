/**
 * CRM Webhook Integration
 * Sends order data to VIPO CRM when new orders are created
 */

const CRM_WEBHOOK_URL = process.env.VIPO_CRM_WEBHOOK_URL || 'http://localhost:4000/api/webhooks/vipo-order';
const CRM_WEBHOOK_SECRET = process.env.VIPO_CRM_WEBHOOK_SECRET || '';

/**
 * Send order to CRM system
 * @param {Object} orderData - Order details
 * @param {string} orderData.orderId - Order ID
 * @param {string} orderData.customerName - Customer name
 * @param {string} orderData.customerPhone - Customer phone
 * @param {string} orderData.customerEmail - Customer email
 * @param {string} orderData.productName - Product name(s)
 * @param {string} orderData.productId - Product ID
 * @param {number} orderData.amount - Order amount
 * @param {string} orderData.agentId - Agent ID (if referral)
 * @param {string} orderData.agentName - Agent name (if referral)
 * @param {string} orderData.referralCode - Referral/coupon code
 * @param {string} orderData.status - Order status
 */
export async function sendOrderToCRM(orderData) {
  if (!CRM_WEBHOOK_URL) {
    console.log('[CRM Webhook] No CRM URL configured, skipping');
    return { success: false, reason: 'no_url_configured' };
  }

  try {
    const payload = {
      orderId: String(orderData.orderId),
      customerName: orderData.customerName || 'לקוח',
      customerPhone: orderData.customerPhone || null,
      customerEmail: orderData.customerEmail || null,
      productName: orderData.productName || 'מוצר',
      productId: String(orderData.productId || ''),
      amount: Number(orderData.amount) || 0,
      agentId: orderData.agentId ? String(orderData.agentId) : null,
      agentName: orderData.agentName || null,
      referralCode: orderData.referralCode || null,
      status: orderData.status || 'pending',
      createdAt: new Date().toISOString(),
    };

    const headers = {
      'Content-Type': 'application/json',
    };

    if (CRM_WEBHOOK_SECRET) {
      headers['X-Webhook-Secret'] = CRM_WEBHOOK_SECRET;
    }

    const response = await fetch(CRM_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[CRM Webhook] Error response:', response.status, errorText);
      return { success: false, status: response.status, error: errorText };
    }

    const result = await response.json().catch(() => ({}));
    console.log('[CRM Webhook] [OK] Order sent to CRM:', {
      orderId: payload.orderId,
      leadId: result.leadId,
      isNew: result.isNew,
    });

    return { success: true, ...result };
  } catch (error) {
    console.error('[CRM Webhook] Failed to send:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send WhatsApp message notification to CRM
 * @param {Object} messageData - Message details
 */
export async function sendWhatsAppMessageToCRM(messageData) {
  const whatsappWebhookUrl = process.env.VIPO_CRM_WHATSAPP_WEBHOOK_URL || 
    CRM_WEBHOOK_URL.replace('/vipo-order', '/whatsapp');

  if (!whatsappWebhookUrl) {
    return { success: false, reason: 'no_url_configured' };
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (CRM_WEBHOOK_SECRET) {
      headers['X-Webhook-Secret'] = CRM_WEBHOOK_SECRET;
    }

    const response = await fetch(whatsappWebhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(messageData),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { success: false, status: response.status };
    }

    return { success: true, ...(await response.json().catch(() => ({}))) };
  } catch (error) {
    console.error('[CRM WhatsApp Webhook] Failed:', error.message);
    return { success: false, error: error.message };
  }
}
