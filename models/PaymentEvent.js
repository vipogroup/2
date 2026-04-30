import mongoose from 'mongoose';

const { Schema, models, model } = mongoose;

/**
 * PaymentEvent - מעקב אחר אירועי תשלום מ-PayPlus
 * כולל Idempotency, retry tracking, ו-audit trail
 */
const paymentEventSchema = new Schema(
  {
    // === Multi-Tenant ===
    tenantId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Tenant', 
      default: null,
      index: true,
    },
    
    // Idempotency key - מונע עיבוד כפול של אותו אירוע
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // קשר להזמנה במערכת
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },

    // מזהה העסקה ב-PayPlus
    transactionId: {
      type: String,
      index: true,
    },

    // Session ID מ-PayPlus
    sessionId: {
      type: String,
      index: true,
    },

    // סוג האירוע
    type: {
      type: String,
      enum: [
        'initiated',      // התחלת תהליך תשלום
        'pending',        // ממתין לאישור (3DS וכו')
        'success',        // תשלום הצליח
        'failed',         // תשלום נכשל
        'refund',         // זיכוי מלא
        'partial_refund', // זיכוי חלקי
        'chargeback',     // צ'ארג'בק
        'cancelled',      // בוטל
      ],
      required: true,
      index: true,
    },

    // פרטי התשלום
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'ILS',
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'bit', 'apple_pay', 'google_pay', 'paypal', 'bank_transfer', 'other'],
      default: 'credit_card',
    },
    cardLast4: {
      type: String,
      default: null,
    },
    cardBrand: {
      type: String,
      enum: ['visa', 'mastercard', 'amex', 'diners', 'isracard', 'other', null],
      default: null,
    },

    // Raw payload מ-PayPlus (לצורך debugging ו-audit)
    rawPayload: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },

    // אימות חתימה
    signature: {
      type: String,
      default: null,
    },
    signatureValid: {
      type: Boolean,
      default: null,
    },

    // סטטוס עיבוד
    status: {
      type: String,
      enum: ['pending', 'processing', 'processed', 'failed', 'ignored'],
      default: 'pending',
      index: true,
    },
    processedAt: {
      type: Date,
      default: null,
    },

    // Retry mechanism
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },
    retryHistory: [{
      attemptNumber: Number,
      attemptedAt: Date,
      error: String,
      success: Boolean,
    }],

    // שגיאות
    errorCode: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },

    // PayPlus specific fields
    payplusErrorCode: {
      type: String,
      default: null,
    },
    payplusErrorMessage: {
      type: String,
      default: null,
    },

    // נשלח ל-Dead Letter Queue?
    inDeadLetter: {
      type: Boolean,
      default: false,
    },
    deadLetterReason: {
      type: String,
      default: null,
    },
    deadLetterAt: {
      type: Date,
      default: null,
    },

    // IP ו-metadata נוספים
    sourceIp: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
paymentEventSchema.index({ orderId: 1, type: 1, createdAt: -1 });
paymentEventSchema.index({ transactionId: 1, createdAt: -1 });
paymentEventSchema.index({ status: 1, nextRetryAt: 1 });
paymentEventSchema.index({ inDeadLetter: 1, createdAt: -1 });
paymentEventSchema.index({ createdAt: -1 });

// Static method: יצירת eventId ייחודי
paymentEventSchema.statics.generateEventId = function (payload) {
  const crypto = require('crypto');
  const data = JSON.stringify({
    txId: payload.transaction_uid || payload.transactionId,
    type: payload.type || payload.status,
    amount: payload.amount,
    timestamp: payload.timestamp || payload.created_at,
  });
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
};

// Static method: בדיקה אם האירוע כבר עובד
paymentEventSchema.statics.isAlreadyProcessed = async function (eventId) {
  const existing = await this.findOne({ eventId, status: 'processed' });
  return !!existing;
};

// Instance method: סימון כ-processed
paymentEventSchema.methods.markAsProcessed = async function () {
  this.status = 'processed';
  this.processedAt = new Date();
  await this.save();
};

// Instance method: סימון כנכשל
paymentEventSchema.methods.markAsFailed = async function (errorCode, errorMessage) {
  this.status = 'failed';
  this.errorCode = errorCode;
  this.errorMessage = errorMessage;
  this.retryHistory.push({
    attemptNumber: this.retryCount + 1,
    attemptedAt: new Date(),
    error: errorMessage,
    success: false,
  });
  this.retryCount += 1;

  // Calculate next retry time if retries remaining
  if (this.retryCount < this.maxRetries) {
    const delays = [10000, 30000, 60000]; // ms
    const delay = delays[Math.min(this.retryCount - 1, delays.length - 1)];
    this.nextRetryAt = new Date(Date.now() + delay);
    this.status = 'pending';
  } else {
    // Move to dead letter queue
    this.inDeadLetter = true;
    this.deadLetterReason = `Max retries (${this.maxRetries}) exceeded. Last error: ${errorMessage}`;
    this.deadLetterAt = new Date();
  }

  await this.save();
};

// Instance method: שליחה ל-Dead Letter Queue
paymentEventSchema.methods.sendToDeadLetter = async function (reason) {
  this.inDeadLetter = true;
  this.deadLetterReason = reason;
  this.deadLetterAt = new Date();
  this.status = 'failed';
  await this.save();
};

export default models.PaymentEvent || model('PaymentEvent', paymentEventSchema);
