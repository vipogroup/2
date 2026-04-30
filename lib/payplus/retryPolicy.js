/**
 * PayPlus Retry Policy & Dead Letter Queue Management
 */

// Default retry configuration
export const RETRY_CONFIG = {
  maxAttempts: parseInt(process.env.PAYPLUS_RETRY_ATTEMPTS || '3', 10),
  delays: (process.env.PAYPLUS_RETRY_DELAYS || '10000,30000,60000').split(',').map(Number),
  deadLetterEnabled: process.env.INTEGRATION_DEAD_LETTER_ENABLED === 'true',
  alertOnDeadLetter: true,
};

/**
 * Calculate next retry delay based on attempt number
 * @param {number} attemptNumber - Current attempt number (1-based)
 * @returns {number} Delay in milliseconds
 */
export function getRetryDelay(attemptNumber) {
  const index = Math.min(attemptNumber - 1, RETRY_CONFIG.delays.length - 1);
  return RETRY_CONFIG.delays[index] || 60000;
}

/**
 * Check if should retry based on attempt count
 * @param {number} currentAttempts - Number of attempts made
 * @returns {boolean}
 */
export function shouldRetry(currentAttempts) {
  return currentAttempts < RETRY_CONFIG.maxAttempts;
}

/**
 * Calculate next retry timestamp
 * @param {number} attemptNumber - Current attempt number
 * @returns {Date}
 */
export function getNextRetryTime(attemptNumber) {
  const delay = getRetryDelay(attemptNumber);
  return new Date(Date.now() + delay);
}

/**
 * Dead Letter Queue operations
 */
export const DeadLetterQueue = {
  /**
   * Move event to dead letter queue
   * @param {Object} PaymentEvent - PaymentEvent model
   * @param {string} eventId - Event ID
   * @param {string} reason - Reason for moving to DLQ
   */
  async moveToDeadLetter(PaymentEvent, eventId, reason) {
    const event = await PaymentEvent.findOne({ eventId });
    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    event.inDeadLetter = true;
    event.deadLetterReason = reason;
    event.deadLetterAt = new Date();
    event.status = 'failed';
    await event.save();

    // Trigger alert if enabled
    if (RETRY_CONFIG.alertOnDeadLetter) {
      await this.sendDeadLetterAlert(event);
    }

    return event;
  },

  /**
   * Retry event from dead letter queue
   * @param {Object} PaymentEvent - PaymentEvent model
   * @param {string} eventId - Event ID
   */
  async retryFromDeadLetter(PaymentEvent, eventId) {
    const event = await PaymentEvent.findOne({ eventId, inDeadLetter: true });
    if (!event) {
      throw new Error(`Event ${eventId} not found in dead letter queue`);
    }

    // Reset for retry
    event.inDeadLetter = false;
    event.deadLetterReason = null;
    event.deadLetterAt = null;
    event.status = 'pending';
    event.retryCount = 0;
    event.nextRetryAt = new Date();
    await event.save();

    return event;
  },

  /**
   * Get all events in dead letter queue
   * @param {Object} PaymentEvent - PaymentEvent model
   * @param {Object} options - Query options
   */
  async getDeadLetterEvents(PaymentEvent, options = {}) {
    const { limit = 50, skip = 0 } = options;
    
    return PaymentEvent.find({ inDeadLetter: true })
      .sort({ deadLetterAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  /**
   * Send alert for dead letter event
   * @param {Object} event - PaymentEvent document
   */
  async sendDeadLetterAlert(event) {
    const alertEmail = process.env.INTEGRATION_ALERT_EMAIL;
    const slackWebhook = process.env.INTEGRATION_ALERT_SLACK_WEBHOOK;

    const alertData = {
      type: 'DEAD_LETTER_EVENT',
      eventId: event.eventId,
      orderId: event.orderId?.toString(),
      eventType: event.type,
      amount: event.amount,
      errorMessage: event.errorMessage,
      retryCount: event.retryCount,
      deadLetterReason: event.deadLetterReason,
      timestamp: new Date().toISOString(),
    };

    console.error('[DEAD_LETTER_ALERT]', JSON.stringify(alertData));

    // Send email alert if configured
    if (alertEmail) {
      try {
        // Dynamic import to avoid circular dependencies
        const { sendEmail } = await import('../email.js');
        await sendEmail({
          to: alertEmail,
          subject: `[VIPO ALERT] Dead Letter Event: ${event.eventId}`,
          text: `
Payment event moved to dead letter queue:

Event ID: ${event.eventId}
Order ID: ${event.orderId}
Event Type: ${event.type}
Amount: ${event.amount} ${event.currency}
Error: ${event.errorMessage}
Retry Count: ${event.retryCount}
Reason: ${event.deadLetterReason}

Please investigate and retry if needed.
          `.trim(),
        });
      } catch (emailErr) {
        console.error('[DEAD_LETTER_ALERT] Email failed:', emailErr.message);
      }
    }

    // Send Slack alert if configured
    if (slackWebhook) {
      try {
        await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `:warning: *Dead Letter Event*`,
            attachments: [{
              color: 'danger',
              fields: [
                { title: 'Event ID', value: event.eventId, short: true },
                { title: 'Order ID', value: event.orderId?.toString(), short: true },
                { title: 'Type', value: event.type, short: true },
                { title: 'Amount', value: `${event.amount} ${event.currency}`, short: true },
                { title: 'Error', value: event.errorMessage || 'N/A', short: false },
                { title: 'Reason', value: event.deadLetterReason, short: false },
              ],
            }],
          }),
        });
      } catch (slackErr) {
        console.error('[DEAD_LETTER_ALERT] Slack failed:', slackErr.message);
      }
    }
  },
};

/**
 * Retry scheduler - processes pending retries
 */
export async function processPendingRetries(PaymentEvent, processWebhookFn) {
  const now = new Date();
  
  const pendingEvents = await PaymentEvent.find({
    status: 'pending',
    inDeadLetter: false,
    nextRetryAt: { $lte: now },
    retryCount: { $lt: RETRY_CONFIG.maxAttempts },
  }).limit(100);

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    movedToDeadLetter: 0,
  };

  for (const event of pendingEvents) {
    results.processed++;
    
    try {
      // Attempt to reprocess
      await processWebhookFn(event.rawPayload, event.signature);
      results.succeeded++;
    } catch (err) {
      results.failed++;
      
      // Update retry count and check if should move to dead letter
      event.retryCount++;
      event.retryHistory.push({
        attemptNumber: event.retryCount,
        attemptedAt: new Date(),
        error: err.message,
        success: false,
      });

      if (!shouldRetry(event.retryCount)) {
        event.inDeadLetter = true;
        event.deadLetterReason = `Max retries (${RETRY_CONFIG.maxAttempts}) exceeded`;
        event.deadLetterAt = new Date();
        event.status = 'failed';
        results.movedToDeadLetter++;
        
        if (RETRY_CONFIG.alertOnDeadLetter) {
          await DeadLetterQueue.sendDeadLetterAlert(event);
        }
      } else {
        event.nextRetryAt = getNextRetryTime(event.retryCount);
      }

      await event.save();
    }
  }

  return results;
}
