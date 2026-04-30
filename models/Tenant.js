import mongoose from 'mongoose';

/**
 * Tenant Model - מייצג עסק במערכת Multi-Tenant
 * כל עסק מקבל tenant נפרד עם הגדרות, דומיין ונתונים משלו
 */
const TenantSchema = new mongoose.Schema(
  {
    // === פרטי עסק בסיסיים ===
    name: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: 100,
    },
    slug: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true, 
      lowercase: true,
      index: true,
    },
    
    // === דומיין ===
    domain: { 
      type: String, 
      unique: true, 
      sparse: true, 
      trim: true, 
      lowercase: true,
      index: true,
    },
    subdomain: { 
      type: String, 
      unique: true, 
      sparse: true, 
      trim: true, 
      lowercase: true,
      index: true,
    },
    
    // === בעלות ===
    ownerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true,
    },
    
    // === מצב ===
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending'],
      default: 'pending',
      index: true,
    },
    
    // === עמלת פלטפורמה ===
    platformCommissionRate: { 
      type: Number, 
      default: 5, // 5% עמלת פלטפורמה
      min: 0,
      max: 100,
    },
    
    // === הגדרות מותג ===
    branding: {
      logo: { type: String, default: null },
      favicon: { type: String, default: null },
      primaryColor: { type: String, default: '#1e3a8a' },
      secondaryColor: { type: String, default: '#0891b2' },
      accentColor: { type: String, default: '#06b6d4' },
    },
    
    // === פרטי קשר ===
    contact: {
      email: { type: String, default: null, trim: true, lowercase: true },
      phone: { type: String, default: null, trim: true },
      whatsapp: { type: String, default: null, trim: true },
      address: { type: String, default: null, trim: true },
    },
    
    // === רשתות חברתיות ===
    social: {
      facebook: { type: String, default: null },
      instagram: { type: String, default: null },
      twitter: { type: String, default: null },
      linkedin: { type: String, default: null },
      youtube: { type: String, default: null },
      tiktok: { type: String, default: null },
    },
    
    // === SEO ===
    seo: {
      title: { type: String, default: null, maxlength: 70 },
      description: { type: String, default: null, maxlength: 160 },
      keywords: { type: String, default: null },
      googleAnalyticsId: { type: String, default: null },
      googleTagManagerId: { type: String, default: null },
    },
    
    // === תכונות מופעלות ===
    features: {
      registration: { type: Boolean, default: true },
      groupPurchase: { type: Boolean, default: true },
      notifications: { type: Boolean, default: true },
      darkMode: { type: Boolean, default: false },
      agentSystem: { type: Boolean, default: true },
      coupons: { type: Boolean, default: true },
    },
    
    // === הרשאות תפריטים לדשבורד Business Admin ===
    // ברירת מחדל: מערך ריק - אין הרשאות. Super Admin צריך להפעיל ידנית
    allowedMenus: {
      type: [String],
      default: [],
    },

    allowedMenusConfigured: {
      type: Boolean,
      default: true,
    },
    
    // === הגדרות עמלות סוכנים ===
    agentSettings: {
      defaultCommissionPercent: { type: Number, default: 12, min: 0, max: 100 },
      defaultDiscountPercent: { type: Number, default: 10, min: 0, max: 100 },
      commissionHoldDays: { type: Number, default: 30 },
      groupPurchaseHoldDays: { type: Number, default: 100 },
    },
    
    // === כספים ===
    billing: {
      pendingBalance: { type: Number, default: 0 }, // סכום שממתין לתשלום
      totalPaid: { type: Number, default: 0 }, // סה"כ ששולם לעסק
      lastPaymentAt: { type: Date, default: null },
      paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'paypal', 'check', null],
        default: null,
      },
      bankDetails: {
        bankName: { type: String, default: null },
        branchNumber: { type: String, default: null },
        accountNumber: { type: String, default: null },
        accountName: { type: String, default: null },
      },
    },
    
    // === מודל תשלום ===
    // 'platform' = תשלומים עוברים דרך מנהל ראשי (ברירת מחדל)
    // 'independent' = תשלומים עוברים ישירות לעסק (דורש חיבור PayPlus)
    paymentMode: {
      type: String,
      enum: ['platform', 'independent'],
      default: 'platform',
    },
    
    // === PayPlus - סליקה לכל עסק ===
    payplus: {
      enabled: { type: Boolean, default: false },
      apiKey: { type: String, default: null },
      secretKey: { type: String, default: null },
      terminalId: { type: String, default: null },
      webhookSecret: { type: String, default: null },
      testMode: { type: Boolean, default: true },
    },
    
    // === Priority ERP - לכל עסק ===
    priority: {
      enabled: { type: Boolean, default: false },
      apiUrl: { type: String, default: null },
      username: { type: String, default: null },
      password: { type: String, default: null },
      companyId: { type: String, default: null },
      priceListCode: { type: String, default: null },
      warehouseCode: { type: String, default: null },
    },
    
    // === סטטיסטיקות ===
    stats: {
      totalSales: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      totalProducts: { type: Number, default: 0 },
      totalAgents: { type: Number, default: 0 },
      totalCustomers: { type: Number, default: 0 },
    },
    
    // === מטא-דאטה ===
    createdAt: { type: Date, default: Date.now },
    activatedAt: { type: Date, default: null },
    suspendedAt: { type: Date, default: null },
    suspendReason: { type: String, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// === אינדקסים ===
TenantSchema.index({ ownerId: 1 }, { name: 'idx_owner' });
TenantSchema.index({ status: 1, createdAt: -1 }, { name: 'idx_status_created' });
TenantSchema.index({ 'billing.pendingBalance': -1 }, { name: 'idx_pending_balance' });

// === Virtual: URL מלא ===
TenantSchema.virtual('url').get(function () {
  if (this.domain) {
    return `https://${this.domain}`;
  }
  if (this.subdomain) {
    const baseDomain = process.env.BASE_DOMAIN || 'vipo.co.il';
    return `https://${this.subdomain}.${baseDomain}`;
  }
  return null;
});

// === Methods ===
TenantSchema.methods.toPublic = function () {
  return {
    _id: this._id,
    name: this.name,
    slug: this.slug,
    domain: this.domain,
    subdomain: this.subdomain,
    status: this.status,
    branding: this.branding,
    contact: this.contact,
    social: this.social,
    seo: this.seo,
    features: this.features,
    url: this.url,
  };
};

// === Statics ===
TenantSchema.statics.findByDomain = function (domain) {
  return this.findOne({
    $or: [
      { domain: domain.toLowerCase() },
      { subdomain: domain.split('.')[0].toLowerCase() },
    ],
    status: 'active',
  });
};

TenantSchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug: slug.toLowerCase(), status: 'active' });
};

const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', TenantSchema);

export default Tenant;
