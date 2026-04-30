/**
 * WhatsApp Integration Service
 * 
 * Supports:
 * - local: whatsapp-web.js server running locally
 * - twilio: Twilio WhatsApp API
 * - 360dialog: 360dialog API
 * - mock: Development/testing mode
 */

const WHATSAPP_CONFIG = {
  // Provider options: 'internal', 'local', 'twilio', '360dialog', 'mock'
  provider: process.env.WHATSAPP_PROVIDER || 'internal',
  
  // Local whatsapp-web.js server
  localServerUrl: process.env.WHATSAPP_LOCAL_URL || 'http://localhost:3002',
  
  // Twilio config
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioWhatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
  
  // 360dialog config
  dialogApiKey: process.env.DIALOG_360_API_KEY,
  dialogChannelId: process.env.DIALOG_360_CHANNEL_ID,
};

/**
 * Send a WhatsApp message
 * @param {string} to - Phone number (with country code)
 * @param {string} message - Message content
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Send result
 */
import { sendMockMessage, connectWhatsApp, getConnectionStatus } from './whatsappMockService.js';

export async function sendWhatsAppMessage(to, message, options = {}) {
  // Normalize phone number
  const normalizedPhone = normalizePhoneNumber(to);
  
  switch (WHATSAPP_CONFIG.provider) {
    case 'internal':
      return sendMockMessage(normalizedPhone, message, options);
    case 'local':
      return sendViaLocalServer(normalizedPhone, message, options);
    case 'twilio':
      return sendViaTwilio(normalizedPhone, message, options);
    case '360dialog':
      return sendVia360Dialog(normalizedPhone, message, options);
    case 'mock':
    default:
      return mockSend(normalizedPhone, message, options);
  }
}

/**
 * Send message via local whatsapp-web.js server
 */
async function sendViaLocalServer(to, message, options) {
  const { localServerUrl } = WHATSAPP_CONFIG;
  
  try {
    const response = await fetch(`${localServerUrl}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send via local server');
    }

    return {
      success: true,
      messageId: data.messageId,
      provider: 'local',
    };
  } catch (error) {
    console.error('Local server error:', error);
    throw new Error(`WhatsApp server error: ${error.message}`);
  }
}

/**
 * Get local server status
 */
export async function getLocalServerStatus() {
  try {
    const response = await fetch(`${WHATSAPP_CONFIG.localServerUrl}/status`);
    return await response.json();
  } catch (error) {
    return { ready: false, error: 'Server not running' };
  }
}

/**
 * Get QR code from local server
 */
export async function getLocalServerQR() {
  try {
    const response = await fetch(`${WHATSAPP_CONFIG.localServerUrl}/qr`);
    return await response.json();
  } catch (error) {
    return { error: 'Server not running' };
  }
}

/**
 * Send message via Twilio
 */
async function sendViaTwilio(to, message, options) {
  const { twilioAccountSid, twilioAuthToken, twilioWhatsappNumber } = WHATSAPP_CONFIG;
  
  if (!twilioAccountSid || !twilioAuthToken) {
    throw new Error('Twilio credentials not configured');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
  
  const formData = new URLSearchParams();
  formData.append('To', `whatsapp:${to}`);
  formData.append('From', `whatsapp:${twilioWhatsappNumber}`);
  formData.append('Body', message);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to send via Twilio');
  }

  return {
    success: true,
    messageId: data.sid,
    provider: 'twilio',
  };
}

/**
 * Send message via 360dialog
 */
async function sendVia360Dialog(to, message, options) {
  const { dialogApiKey, dialogChannelId } = WHATSAPP_CONFIG;
  
  if (!dialogApiKey) {
    throw new Error('360dialog API key not configured');
  }

  const response = await fetch('https://waba.360dialog.io/v1/messages', {
    method: 'POST',
    headers: {
      'D360-API-KEY': dialogApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: message },
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to send via 360dialog');
  }

  return {
    success: true,
    messageId: data.messages?.[0]?.id,
    provider: '360dialog',
  };
}

/**
 * Mock send for development/testing
 */
async function mockSend(to, message, options) {
  console.log('[WhatsApp Mock] Sending message:');
  console.log(`  To: ${to}`);
  console.log(`  Message: ${message}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: true,
    messageId: `mock_${Date.now()}`,
    provider: 'mock',
    note: 'This is a mock send. Configure a real provider in .env',
  };
}

/**
 * Normalize phone number to international format
 */
function normalizePhoneNumber(phone) {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Israeli numbers
  if (cleaned.startsWith('0')) {
    cleaned = '972' + cleaned.substring(1);
  }
  
  // Add + prefix if not present
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

/**
 * Send a template message (for approved templates)
 */
export async function sendTemplateMessage(to, templateName, parameters = {}) {
  const normalizedPhone = normalizePhoneNumber(to);
  
  // In production, use the provider's template API
  console.log(`[WhatsApp] Sending template "${templateName}" to ${normalizedPhone}`);
  
  return mockSend(normalizedPhone, `[Template: ${templateName}]`, { parameters });
}

/**
 * Get conversation history (if supported by provider)
 */
export async function getConversationHistory(phoneNumber, limit = 50) {
  // This would need to be implemented based on your provider
  // Some providers don't support fetching history
  return {
    messages: [],
    note: 'Conversation history requires provider-specific implementation',
  };
}

/**
 * Check if WhatsApp is configured and ready
 */
export function isWhatsAppConfigured() {
  if (WHATSAPP_CONFIG.provider === 'mock') {
    return { configured: false, provider: 'mock' };
  }
  
  if (WHATSAPP_CONFIG.provider === 'twilio') {
    return {
      configured: !!(WHATSAPP_CONFIG.twilioAccountSid && WHATSAPP_CONFIG.twilioAuthToken),
      provider: 'twilio',
    };
  }
  
  if (WHATSAPP_CONFIG.provider === '360dialog') {
    return {
      configured: !!WHATSAPP_CONFIG.dialogApiKey,
      provider: '360dialog',
    };
  }
  
  return { configured: false, provider: null };
}
