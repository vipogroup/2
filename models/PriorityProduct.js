import mongoose from 'mongoose';

const { Schema, models, model } = mongoose;

/**
 * PriorityProduct - מיפוי SKU בין המערכת לפריוריטי
 * מאפשר סנכרון מוצרים והגדרת חשבונות חשבונאיים
 */
const priorityProductSchema = new Schema(
  {
    // === Multi-Tenant ===
    tenantId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Tenant', 
      default: null,
      index: true,
    },
    
    // קשר למוצר במערכת
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true,
      index: true,
    },

    // === מזהי Priority ===
    priorityItemCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    priorityItemName: {
      type: String,
      trim: true,
    },
    priorityItemDescription: {
      type: String,
      default: null,
    },

    // === מע"מ ===
    vatType: {
      type: String,
      enum: ['standard', 'exempt', 'reduced', 'zero'],
      default: 'standard',
    },
    vatRate: {
      type: Number,
      default: 17, // 17% מע"מ סטנדרטי בישראל
      min: 0,
      max: 100,
    },

    // === חשבונות חשבונאיים (GL Accounts) ===
    glAccountSales: {
      type: String,
      default: '4100', // חשבון הכנסות ממכירות
      trim: true,
    },
    glAccountVAT: {
      type: String,
      default: '4500', // חשבון מע"מ עסקאות
      trim: true,
    },
    glAccountCOGS: {
      type: String,
      default: null, // חשבון עלות המכר (אם רלוונטי)
      trim: true,
    },
    glAccountInventory: {
      type: String,
      default: null, // חשבון מלאי (אם רלוונטי)
      trim: true,
    },

    // === מחירים ===
    priceInPriority: {
      type: Number,
      default: null,
    },
    costInPriority: {
      type: Number,
      default: null,
    },
    currency: {
      type: String,
      default: 'ILS',
      uppercase: true,
    },

    // === יחידות ===
    unitOfMeasure: {
      type: String,
      default: 'יחידה',
      trim: true,
    },
    priorityUnitCode: {
      type: String,
      default: 'UN',
      trim: true,
    },

    // === קטגוריה בפריוריטי ===
    priorityCategory: {
      type: String,
      default: null,
      trim: true,
    },
    prioritySubCategory: {
      type: String,
      default: null,
      trim: true,
    },

    // === סטטוס ===
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isSyncEnabled: {
      type: Boolean,
      default: true,
    },

    // === סנכרון ===
    lastSyncAt: {
      type: Date,
      default: null,
    },
    lastSyncStatus: {
      type: String,
      enum: ['success', 'failed', 'pending', null],
      default: null,
    },
    lastSyncError: {
      type: String,
      default: null,
    },
    syncDirection: {
      type: String,
      enum: ['to_priority', 'from_priority', 'bidirectional'],
      default: 'to_priority',
    },

    // === Metadata נוסף ===
    barcode: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },
    supplierCode: {
      type: String,
      default: null,
      trim: true,
    },
    manufacturerCode: {
      type: String,
      default: null,
      trim: true,
    },

    // === הגדרות מיוחדות ===
    customFields: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },

    // === היסטוריית שינויים ===
    changeHistory: [{
      changedAt: { type: Date, default: Date.now },
      changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      field: String,
      oldValue: Schema.Types.Mixed,
      newValue: Schema.Types.Mixed,
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes
priorityProductSchema.index({ isActive: 1, isSyncEnabled: 1 });
priorityProductSchema.index({ lastSyncAt: 1, lastSyncStatus: 1 });
priorityProductSchema.index({ priorityCategory: 1, isActive: 1 });

// Static method: קבלת מיפוי לפי productId
priorityProductSchema.statics.getByProductId = async function (productId) {
  return await this.findOne({ productId, isActive: true });
};

// Static method: קבלת מיפוי לפי priorityItemCode
priorityProductSchema.statics.getByItemCode = async function (itemCode) {
  return await this.findOne({ priorityItemCode: itemCode, isActive: true });
};

// Static method: יצירת או עדכון מיפוי
priorityProductSchema.statics.upsertMapping = async function (productId, data, userId = null) {
  const existing = await this.findOne({ productId });

  if (existing) {
    // Track changes
    const changes = [];
    for (const [key, newValue] of Object.entries(data)) {
      if (existing[key] !== newValue && key !== 'changeHistory') {
        changes.push({
          changedAt: new Date(),
          changedBy: userId,
          field: key,
          oldValue: existing[key],
          newValue: newValue,
        });
      }
    }

    // Update fields
    Object.assign(existing, data);

    // Add changes to history
    if (changes.length > 0) {
      existing.changeHistory.push(...changes);
      // Keep only last 100 changes
      if (existing.changeHistory.length > 100) {
        existing.changeHistory = existing.changeHistory.slice(-100);
      }
    }

    await existing.save();
    return existing;
  } else {
    return await this.create({ productId, ...data });
  }
};

// Static method: קבלת כל המוצרים הפעילים לסנכרון
priorityProductSchema.statics.getActiveForSync = async function () {
  return await this.find({ isActive: true, isSyncEnabled: true })
    .populate('productId')
    .sort({ lastSyncAt: 1 });
};

// Instance method: עדכון סטטוס סנכרון
priorityProductSchema.methods.updateSyncStatus = async function (status, error = null) {
  this.lastSyncAt = new Date();
  this.lastSyncStatus = status;
  this.lastSyncError = error;
  await this.save();
};

// Instance method: המרה לפורמט Priority API
priorityProductSchema.methods.toPriorityFormat = function () {
  return {
    PARTNAME: this.priorityItemCode,
    PARTDES: this.priorityItemName,
    UNIT: this.priorityUnitCode,
    VATFLAG: this.vatType === 'exempt' ? 'E' : this.vatType === 'zero' ? 'Z' : 'Y',
    // Add more fields as needed based on Priority API structure
  };
};

// Virtual: קישור למוצר המלא
priorityProductSchema.virtual('product', {
  ref: 'Product',
  localField: 'productId',
  foreignField: '_id',
  justOne: true,
});

export default models.PriorityProduct || model('PriorityProduct', priorityProductSchema);
