/**
 * WhatsApp Mock Service - פתרון פנימי להדגמה
 * 
 * מדמה שליחת הודעות וואטסאפ בצורה ריאלית
 * מושלם להדגמות למשקיעים
 */

let isConnected = false;
let connectedPhone = null;
let messageHistory = [];

/**
 * מדמה התחברות לוואטסאפ
 */
export function connectWhatsApp(phone = '0533752633') {
  return new Promise((resolve) => {
    setTimeout(() => {
      isConnected = true;
      connectedPhone = phone;
      resolve({
        success: true,
        phone: phone,
        name: 'Demo Business',
      });
    }, 2000); // דיליי של 2 שניות כמו התחברות אמיתית
  });
}

/**
 * מדמה שליחת הודעה
 */
export function sendMockMessage(to, message, options = {}) {
  return new Promise((resolve) => {
    if (!isConnected) {
      resolve({
        success: false,
        error: 'WhatsApp not connected',
      });
      return;
    }

    setTimeout(() => {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const messageData = {
        id: messageId,
        to: to,
        from: connectedPhone,
        message: message,
        timestamp: new Date().toISOString(),
        status: 'sent',
        type: options.template ? 'template' : 'text',
      };

      messageHistory.push(messageData);

      // מדמה קבלת אישור קריאה אחרי 3 שניות
      setTimeout(() => {
        const msg = messageHistory.find(m => m.id === messageId);
        if (msg) {
          msg.status = 'read';
          msg.readAt = new Date().toISOString();
        }
      }, 3000);

      resolve({
        success: true,
        messageId: messageId,
        timestamp: messageData.timestamp,
        provider: 'internal_mock',
      });
    }, 1000); // דיליי של שנייה כמו שליחה אמיתית
  });
}

/**
 * מקבל היסטוריית הודעות
 */
export function getMessageHistory(limit = 10) {
  return messageHistory.slice(-limit);
}

/**
 * מקבל סטטוס חיבור
 */
export function getConnectionStatus() {
  return {
    connected: isConnected,
    phone: connectedPhone,
    provider: 'VIPO WhatsApp',
    messagesCount: messageHistory.length,
  };
}

/**
 * מנתק את החיבור
 */
export function disconnectWhatsApp() {
  isConnected = false;
  connectedPhone = null;
  return { success: true };
}

/**
 * מדמה קבלת הודעה (לדמו)
 */
export function simulateIncomingMessage(from, message) {
  if (!isConnected) return null;

  const messageData = {
    id: `msg_in_${Date.now()}`,
    from: from,
    to: connectedPhone,
    message: message,
    timestamp: new Date().toISOString(),
    status: 'received',
    type: 'text',
  };

  messageHistory.push(messageData);
  
  // מפעיל webhook אם קיים
  if (global.whatsappWebhook) {
    global.whatsappWebhook(messageData);
  }

  return messageData;
}

/**
 * מנקה היסטוריה
 */
export function clearHistory() {
  messageHistory = [];
  return { success: true };
}
