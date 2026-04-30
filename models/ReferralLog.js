import mongoose from 'mongoose';

/**
 * ReferralLog - מעקב אחר כניסות ולחיצות על לינקים של סוכנים
 */
const ReferralLogSchema = new mongoose.Schema(
  {
    // === Multi-Tenant ===
    tenantId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Tenant', 
      default: null,
      index: true,
    },
    
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
      index: true,
    },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    referer: { type: String, default: null },
    url: { type: String, required: true },
    action: {
      type: String,
      enum: ['click', 'view', 'register', 'purchase'],
      default: 'click',
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    versionKey: false,
  },
);

// Indexes for performance
ReferralLogSchema.index({ agentId: 1, createdAt: -1 });
ReferralLogSchema.index({ productId: 1, createdAt: -1 });
ReferralLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.models.ReferralLog || mongoose.model('ReferralLog', ReferralLogSchema);
