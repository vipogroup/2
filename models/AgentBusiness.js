import mongoose from 'mongoose';

/**
 * AgentBusiness Model
 * מקשר בין סוכן לעסק - מאפשר לסוכן לעבוד עם מספר עסקים
 */
const AgentBusinessSchema = new mongoose.Schema(
  {
    // הסוכן
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    // העסק (Tenant)
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    
    // קוד קופון ייחודי לסוכן בעסק הזה
    couponCode: {
      type: String,
      required: true,
      index: true,
    },
    
    // אחוז עמלה (יכול להיות שונה לכל עסק)
    commissionPercent: {
      type: Number,
      default: 12,
      min: 0,
      max: 100,
    },
    
    // סטטוס הקשר
    status: {
      type: String,
      enum: ['pending', 'active', 'blocked', 'left'],
      default: 'active',
    },
    
    // סטטיסטיקות לכל עסק
    totalSales: {
      type: Number,
      default: 0,
    },
    totalCommission: {
      type: Number,
      default: 0,
    },
    ordersCount: {
      type: Number,
      default: 0,
    },
    
    // תאריכים
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
      default: null,
    },
    
    // הערות
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// אינדקס משולב לוודא שסוכן לא מצטרף לאותו עסק פעמיים
AgentBusinessSchema.index({ agentId: 1, tenantId: 1 }, { unique: true });

// אינדקס לחיפוש לפי קוד קופון
AgentBusinessSchema.index({ couponCode: 1, tenantId: 1 });

export default mongoose.models.AgentBusiness || mongoose.model('AgentBusiness', AgentBusinessSchema);
