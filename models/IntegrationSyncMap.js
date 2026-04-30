import mongoose from 'mongoose';

const { Schema, models, model } = mongoose;

/**
 * IntegrationSyncMap - מיפוי סנכרון בין PayPlus, Priority והמערכת
 * מאפשר מעקב אחר סטטוס הסנכרון ושמירת כל ה-IDs הרלוונטיים
 */
const integrationSyncMapSchema = new Schema(
  {
    // === Multi-Tenant ===
    tenantId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Tenant', 
      default: null,
      index: true,
    },
    
    // קשר להזמנה במערכת
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true,
    },

    // === PayPlus IDs ===
    payplusTransactionId: {
      type: String,
      sparse: true,
      index: true,
    },
    payplusSessionId: {
      type: String,
      sparse: true,
      index: true,
    },
    payplusPaymentMethod: {
      type: String,
      default: null,
    },
    payplusCardLast4: {
      type: String,
      default: null,
    },

    // === Priority IDs ===
    priorityCustomerId: {
      type: String,
      sparse: true,
      index: true,
    },
    prioritySalesOrderId: {
      type: String,
      sparse: true,
      index: true,
    },
    priorityInvoiceId: {
      type: String,
      sparse: true,
      index: true,
    },
    priorityReceiptId: {
      type: String,
      sparse: true,
      index: true,
    },
    priorityCreditNoteId: {
      type: String,
      sparse: true,
      index: true,
    },
    priorityPaymentId: {
      type: String,
      sparse: true,
      index: true,
    },

    // מספרי מסמכים (לקריאות)
    invoiceNumber: {
      type: String,
      default: null,
    },
    receiptNumber: {
      type: String,
      default: null,
    },
    creditNoteNumber: {
      type: String,
      default: null,
    },

    // === סטטוס סנכרון ===
    syncStatus: {
      type: String,
      enum: ['pending', 'syncing', 'synced', 'partial', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // סטטוס סנכרון מפורט לכל מערכת
    payplusSyncStatus: {
      type: String,
      enum: ['pending', 'synced', 'failed', 'not_required'],
      default: 'pending',
    },
    priorityCustomerSyncStatus: {
      type: String,
      enum: ['pending', 'synced', 'failed', 'not_required'],
      default: 'pending',
    },
    priorityOrderSyncStatus: {
      type: String,
      enum: ['pending', 'synced', 'failed', 'not_required'],
      default: 'pending',
    },
    priorityInvoiceSyncStatus: {
      type: String,
      enum: ['pending', 'synced', 'failed', 'not_required'],
      default: 'pending',
    },
    priorityReceiptSyncStatus: {
      type: String,
      enum: ['pending', 'synced', 'failed', 'not_required'],
      default: 'pending',
    },

    // === תאריכי סנכרון ===
    lastSyncAttempt: {
      type: Date,
      default: null,
    },
    lastSyncSuccess: {
      type: Date,
      default: null,
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },

    // === לוג שגיאות ===
    errorLog: [{
      date: { type: Date, default: Date.now },
      system: { type: String, enum: ['payplus', 'priority', 'internal'] },
      operation: { type: String },
      errorCode: { type: String },
      errorMessage: { type: String },
      rawResponse: { type: Schema.Types.Mixed },
    }],

    // === Retry tracking ===
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 5,
    },

    // === סכומים לצורך reconciliation ===
    orderAmount: {
      type: Number,
      default: 0,
    },
    payplusAmount: {
      type: Number,
      default: null,
    },
    priorityAmount: {
      type: Number,
      default: null,
    },
    amountMismatch: {
      type: Boolean,
      default: false,
    },
    mismatchAmount: {
      type: Number,
      default: null,
    },

    // === Reconciliation ===
    reconciled: {
      type: Boolean,
      default: false,
    },
    reconciledAt: {
      type: Date,
      default: null,
    },
    reconciledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reconciliationNotes: {
      type: String,
      default: null,
    },

    // === Metadata ===
    metadata: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
integrationSyncMapSchema.index({ syncStatus: 1, lastSyncAttempt: -1 });
integrationSyncMapSchema.index({ syncStatus: 1, nextRetryAt: 1 });
integrationSyncMapSchema.index({ amountMismatch: 1, reconciled: 1 });
integrationSyncMapSchema.index({ createdAt: -1 });

// Static method: קבלת או יצירת מפה לפי orderId
integrationSyncMapSchema.statics.getOrCreate = async function (orderId) {
  let syncMap = await this.findOne({ orderId });
  if (!syncMap) {
    syncMap = await this.create({ orderId });
  }
  return syncMap;
};

// Instance method: עדכון סטטוס PayPlus
integrationSyncMapSchema.methods.updatePayplusStatus = async function (transactionId, sessionId, status = 'synced') {
  this.payplusTransactionId = transactionId || this.payplusTransactionId;
  this.payplusSessionId = sessionId || this.payplusSessionId;
  this.payplusSyncStatus = status;
  this.lastSyncAttempt = new Date();
  if (status === 'synced') {
    this.lastSyncSuccess = new Date();
  }
  await this.updateOverallStatus();
  await this.save();
};

// Instance method: עדכון סטטוס Priority Customer
integrationSyncMapSchema.methods.updatePriorityCustomerStatus = async function (customerId, status = 'synced') {
  this.priorityCustomerId = customerId || this.priorityCustomerId;
  this.priorityCustomerSyncStatus = status;
  this.lastSyncAttempt = new Date();
  if (status === 'synced') {
    this.lastSyncSuccess = new Date();
  }
  await this.updateOverallStatus();
  await this.save();
};

// Instance method: עדכון סטטוס Priority Order
integrationSyncMapSchema.methods.updatePriorityOrderStatus = async function (salesOrderId, status = 'synced') {
  this.prioritySalesOrderId = salesOrderId || this.prioritySalesOrderId;
  this.priorityOrderSyncStatus = status;
  this.lastSyncAttempt = new Date();
  if (status === 'synced') {
    this.lastSyncSuccess = new Date();
  }
  await this.updateOverallStatus();
  await this.save();
};

// Instance method: עדכון סטטוס Priority Invoice
integrationSyncMapSchema.methods.updatePriorityInvoiceStatus = async function (invoiceId, invoiceNumber, status = 'synced') {
  this.priorityInvoiceId = invoiceId || this.priorityInvoiceId;
  this.invoiceNumber = invoiceNumber || this.invoiceNumber;
  this.priorityInvoiceSyncStatus = status;
  this.lastSyncAttempt = new Date();
  if (status === 'synced') {
    this.lastSyncSuccess = new Date();
  }
  await this.updateOverallStatus();
  await this.save();
};

// Instance method: עדכון סטטוס כללי
integrationSyncMapSchema.methods.updateOverallStatus = function () {
  const statuses = [
    this.payplusSyncStatus,
    this.priorityCustomerSyncStatus,
    this.priorityOrderSyncStatus,
    this.priorityInvoiceSyncStatus,
    this.priorityReceiptSyncStatus,
  ];

  const activeStatuses = statuses.filter(s => s !== 'not_required');

  if (activeStatuses.every(s => s === 'synced')) {
    this.syncStatus = 'synced';
  } else if (activeStatuses.some(s => s === 'failed')) {
    this.syncStatus = 'failed';
  } else if (activeStatuses.some(s => s === 'synced')) {
    this.syncStatus = 'partial';
  } else if (activeStatuses.some(s => s === 'syncing')) {
    this.syncStatus = 'syncing';
  } else {
    this.syncStatus = 'pending';
  }
};

// Instance method: הוספת שגיאה ללוג
integrationSyncMapSchema.methods.logError = async function (system, operation, errorCode, errorMessage, rawResponse = null) {
  this.errorLog.push({
    date: new Date(),
    system,
    operation,
    errorCode,
    errorMessage,
    rawResponse,
  });

  // Keep only last 50 errors
  if (this.errorLog.length > 50) {
    this.errorLog = this.errorLog.slice(-50);
  }

  await this.save();
};

// Instance method: בדיקת התאמת סכומים
integrationSyncMapSchema.methods.checkAmountMismatch = function () {
  const amounts = [this.orderAmount, this.payplusAmount, this.priorityAmount].filter(a => a !== null);
  if (amounts.length < 2) return false;

  const tolerance = 0.01; // 1 אגורה
  const allMatch = amounts.every(a => Math.abs(a - amounts[0]) <= tolerance);

  this.amountMismatch = !allMatch;
  if (this.amountMismatch) {
    this.mismatchAmount = Math.max(...amounts) - Math.min(...amounts);
  }

  return this.amountMismatch;
};

export default models.IntegrationSyncMap || model('IntegrationSyncMap', integrationSyncMapSchema);
