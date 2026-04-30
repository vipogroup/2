import mongoose from 'mongoose';

const GroupPurchaseSchema = new mongoose.Schema(
  {
    // === Multi-Tenant ===
    tenantId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Tenant', 
      default: null,
      index: true,
    },
    
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['open', 'closed', 'shipped', 'arrived', 'delivering', 'completed', 'cancelled'],
      default: 'open',
      index: true,
    },

    // תאריכים אמיתיים לאורך חיי הרכישה הקבוצתית
    openedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    shippedAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null },
    deliveryStartedAt: { type: Date, default: null },
    deliveryCompletedAt: { type: Date, default: null },
    commissionReleaseDate: { type: Date, default: null },

    // הגדרות ברירת מחדל (ימים)
    settings: {
      closingDays: { type: Number, default: 30, min: 0 },
      shippingDays: { type: Number, default: 60, min: 0 },
      deliveryDays: { type: Number, default: 14, min: 0 },
      cancelPeriodDays: { type: Number, default: 14, min: 0 },
    },

    // קשר להזמנות
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],

    // נתונים כספיים
    totalOrders: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    totalCommission: { type: Number, default: 0, min: 0 },

    notes: { type: String, default: '', trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

GroupPurchaseSchema.index({ status: 1, commissionReleaseDate: 1 });
GroupPurchaseSchema.index({ createdAt: -1 });

export default mongoose.models.GroupPurchase || mongoose.model('GroupPurchase', GroupPurchaseSchema);
