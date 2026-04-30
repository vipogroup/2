/**
 * Alert Service
 * 
 * Centralized alert system for critical events.
 * Supports: Email, Slack, SMS (via Twilio)
 */

// Alert rules configuration
export const ALERT_RULES = {
  webhook_missing: {
    name: 'webhook_missing',
    description: 'Webhook not received for paid order',
    severity: 'critical',
    channels: ['slack', 'email'],
    cooldownMinutes: 30,
  },
  priority_sync_failed: {
    name: 'priority_sync_failed',
    description: 'Priority sync failed after retries',
    severity: 'high',
    channels: ['slack', 'email'],
    cooldownMinutes: 60,
  },
  amount_mismatch: {
    name: 'amount_mismatch',
    description: 'Payment amount does not match order amount',
    severity: 'critical',
    channels: ['slack', 'email'],
    cooldownMinutes: 0,
  },
  chargeback_received: {
    name: 'chargeback_received',
    description: 'Chargeback received for order',
    severity: 'critical',
    channels: ['slack', 'email', 'sms'],
    cooldownMinutes: 0,
  },
  high_pending_withdrawals: {
    name: 'high_pending_withdrawals',
    description: 'High number of pending withdrawal requests',
    severity: 'medium',
    channels: ['email'],
    cooldownMinutes: 240,
  },
  dead_letter_threshold: {
    name: 'dead_letter_threshold',
    description: 'Dead letter queue threshold exceeded',
    severity: 'high',
    channels: ['slack', 'email'],
    cooldownMinutes: 120,
  },
  daily_reconciliation: {
    name: 'daily_reconciliation',
    description: 'Daily reconciliation report',
    severity: 'info',
    channels: ['email'],
    cooldownMinutes: 1440,
  },
};

// Track last alert times for cooldown
const lastAlertTimes = new Map();

/**
 * Check if alert is in cooldown
 */
function isInCooldown(ruleName) {
  const rule = ALERT_RULES[ruleName];
  if (!rule || rule.cooldownMinutes === 0) return false;

  const lastTime = lastAlertTimes.get(ruleName);
  if (!lastTime) return false;

  const cooldownMs = rule.cooldownMinutes * 60 * 1000;
  return (Date.now() - lastTime) < cooldownMs;
}

/**
 * Send alert through configured channels
 */
export async function sendAlert(ruleName, data = {}) {
  const rule = ALERT_RULES[ruleName];
  if (!rule) {
    console.warn(`[ALERT] Unknown rule: ${ruleName}`);
    return { sent: false, reason: 'unknown_rule' };
  }

  // Check cooldown
  if (isInCooldown(ruleName)) {
    console.log(`[ALERT] Skipping ${ruleName} - in cooldown`);
    return { sent: false, reason: 'cooldown' };
  }

  const results = {
    rule: ruleName,
    severity: rule.severity,
    channels: {},
  };

  // Send to each configured channel
  for (const channel of rule.channels) {
    try {
      switch (channel) {
        case 'email':
          results.channels.email = await sendEmailAlert(rule, data);
          break;
        case 'slack':
          results.channels.slack = await sendSlackAlert(rule, data);
          break;
        case 'sms':
          results.channels.sms = await sendSmsAlert(rule, data);
          break;
      }
    } catch (err) {
      console.error(`[ALERT] Failed to send ${channel} alert:`, err.message);
      results.channels[channel] = { sent: false, error: err.message };
    }
  }

  // Update cooldown
  lastAlertTimes.set(ruleName, Date.now());

  console.log(`[ALERT] Sent ${ruleName}:`, JSON.stringify(results));
  return results;
}

/**
 * Send email alert
 */
async function sendEmailAlert(rule, data) {
  const alertEmail = process.env.INTEGRATION_ALERT_EMAIL;
  if (!alertEmail) {
    return { sent: false, reason: 'no_email_configured' };
  }

  const severityEmoji = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    info: '🔵',
  };

  const subject = `${severityEmoji[rule.severity] || '⚪'} [VIPO] ${rule.description}`;
  const text = formatAlertMessage(rule, data);

  try {
    const { sendEmail } = await import('@/lib/email.js');
    await sendEmail({ to: alertEmail, subject, text });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

/**
 * Send Slack alert
 */
async function sendSlackAlert(rule, data) {
  const slackWebhook = process.env.INTEGRATION_ALERT_SLACK_WEBHOOK;
  if (!slackWebhook) {
    return { sent: false, reason: 'no_slack_configured' };
  }

  const severityColor = {
    critical: 'danger',
    high: 'warning',
    medium: '#ffcc00',
    info: 'good',
  };

  const payload = {
    text: `*${rule.description}*`,
    attachments: [{
      color: severityColor[rule.severity] || '#808080',
      fields: Object.entries(data).map(([key, value]) => ({
        title: key,
        value: String(value),
        short: String(value).length < 30,
      })),
      footer: 'VIPO Alert System',
      ts: Math.floor(Date.now() / 1000),
    }],
  };

  try {
    const res = await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { sent: res.ok };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

/**
 * Send SMS alert via Twilio
 */
async function sendSmsAlert(rule, data) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const toNumber = process.env.ALERT_SMS_NUMBER;

  if (!accountSid || !authToken || !fromNumber || !toNumber) {
    return { sent: false, reason: 'sms_not_configured' };
  }

  const message = `[VIPO ${rule.severity.toUpperCase()}] ${rule.description}. ${data.orderId ? `Order: ${data.orderId}` : ''}`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: toNumber,
        From: fromNumber,
        Body: message,
      }),
    });
    return { sent: res.ok };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

/**
 * Format alert message
 */
function formatAlertMessage(rule, data) {
  let message = `
=== VIPO Alert ===
Type: ${rule.name}
Severity: ${rule.severity.toUpperCase()}
Description: ${rule.description}
Time: ${new Date().toLocaleString('he-IL')}

Details:
`;

  for (const [key, value] of Object.entries(data)) {
    message += `  ${key}: ${value}\n`;
  }

  message += `
---
This is an automated alert from VIPO Agent System.
`;

  return message.trim();
}

/**
 * Trigger specific alerts
 */
export const alerts = {
  webhookMissing: (orderId, amount) => 
    sendAlert('webhook_missing', { orderId, amount, event: 'Payment received but no webhook' }),
  
  prioritySyncFailed: (orderId, error) => 
    sendAlert('priority_sync_failed', { orderId, error }),
  
  amountMismatch: (orderId, paymentAmount, orderAmount) => 
    sendAlert('amount_mismatch', { orderId, paymentAmount, orderAmount, diff: Math.abs(paymentAmount - orderAmount) }),
  
  chargebackReceived: (orderId, amount, transactionId) => 
    sendAlert('chargeback_received', { orderId, amount, transactionId }),
  
  highPendingWithdrawals: (count, totalAmount) => 
    sendAlert('high_pending_withdrawals', { pendingCount: count, totalAmount }),
  
  deadLetterThreshold: (count) => 
    sendAlert('dead_letter_threshold', { eventsInDLQ: count }),
  
  dailyReconciliation: (summary) => 
    sendAlert('daily_reconciliation', summary),
};

export default alerts;
