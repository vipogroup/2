import mongoose from 'mongoose';

/**
 * BrandingSettings - מודל לניהול צבעים ועיצוב
 * 
 * שני סוגים:
 * 1. type: 'global' - הגדרות גלובליות (מנהל ראשי)
 * 2. type: 'tenant' - הגדרות לעסק ספציפי (מנהל עסק)
 */

const BrandingSettingsSchema = new mongoose.Schema({
  // סוג ההגדרה
  type: {
    type: String,
    enum: ['global', 'tenant'],
    required: true,
    default: 'global',
  },
  
  // מזהה העסק (רק אם type === 'tenant')
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null,
  },
  
  // האם העסק משתמש בעיצוב הגלובלי?
  useGlobalBranding: {
    type: Boolean,
    default: true,
  },
  
  // ===== צבעים ראשיים =====
  colors: {
    // צבע ראשי (כחול כהה בברירת מחדל)
    primary: {
      type: String,
      default: '#1e3a8a',
    },
    // צבע משני (טורקיז בברירת מחדל)
    secondary: {
      type: String,
      default: '#0891b2',
    },
    // צבע הדגשה (אופציונלי)
    accent: {
      type: String,
      default: '#6366f1',
    },
  },
  
  // ===== צבעי סטטוס (קבועים - לא ניתנים לשינוי על ידי עסקים) =====
  statusColors: {
    success: {
      type: String,
      default: '#16a34a',
    },
    warning: {
      type: String,
      default: '#f59e0b',
    },
    error: {
      type: String,
      default: '#dc2626',
    },
    info: {
      type: String,
      default: '#3b82f6',
    },
  },
  
  // ===== לוגו =====
  logo: {
    // URL ללוגו
    url: {
      type: String,
      default: null,
    },
    // לוגו לרקע כהה
    urlLight: {
      type: String,
      default: null,
    },
    // רוחב מקסימלי בפיקסלים
    maxWidth: {
      type: Number,
      default: 150,
    },
  },
  
  // ===== Favicon =====
  favicon: {
    type: String,
    default: null,
  },
  
  // ===== Preset שנבחר (אם יש) =====
  presetId: {
    type: String,
    default: null,
  },
  
  // ===== טיפוגרפיה =====
  typography: {
    // פונט ראשי
    fontFamily: {
      type: String,
      default: 'Heebo, sans-serif',
    },
    // גודל בסיס
    baseFontSize: {
      type: Number,
      default: 16,
    },
  },
  
  // ===== עיגול פינות =====
  borderRadius: {
    // קטן (לכפתורים קטנים)
    small: {
      type: String,
      default: '0.5rem',
    },
    // רגיל (לכפתורים)
    medium: {
      type: String,
      default: '0.75rem',
    },
    // גדול (לכרטיסים)
    large: {
      type: String,
      default: '1rem',
    },
    // מעוגל לגמרי
    full: {
      type: String,
      default: '9999px',
    },
  },
  
  // ===== מטא-דאטה =====
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
}, {
  timestamps: true,
});

// אינדקסים
BrandingSettingsSchema.index({ type: 1 });
BrandingSettingsSchema.index({ tenantId: 1 }, { sparse: true });
BrandingSettingsSchema.index({ type: 1, tenantId: 1 }, { unique: true });

// וירטואלים - חישוב הגרדיאנט
BrandingSettingsSchema.virtual('gradient').get(function() {
  return `linear-gradient(135deg, ${this.colors.primary} 0%, ${this.colors.secondary} 100%)`;
});

// וירטואלים - צבעים מלאים עם סטטוס
BrandingSettingsSchema.virtual('allColors').get(function() {
  return {
    ...this.colors,
    status: this.statusColors,
  };
});

// מתודה סטטית - קבלת הגדרות גלובליות
BrandingSettingsSchema.statics.getGlobal = async function() {
  let global = await this.findOne({ type: 'global' });
  if (!global) {
    global = await this.create({ type: 'global' });
  }
  return global;
};

// מתודה סטטית - קבלת הגדרות לעסק (עם fallback לגלובלי)
BrandingSettingsSchema.statics.getForTenant = async function(tenantId) {
  // נסה למצוא הגדרות ספציפיות לעסק
  const tenantSettings = await this.findOne({ type: 'tenant', tenantId });
  
  // אם אין הגדרות או שהעסק משתמש בגלובלי
  if (!tenantSettings || tenantSettings.useGlobalBranding) {
    return this.getGlobal();
  }
  
  return tenantSettings;
};

// מתודה סטטית - עדכון הגדרות גלובליות
BrandingSettingsSchema.statics.updateGlobal = async function(updates, userId) {
  return this.findOneAndUpdate(
    { type: 'global' },
    { 
      ...updates, 
      updatedBy: userId,
      type: 'global',
    },
    { new: true, upsert: true }
  );
};

// מתודה סטטית - עדכון הגדרות עסק
BrandingSettingsSchema.statics.updateTenant = async function(tenantId, updates, userId) {
  // וודא שצבעי סטטוס לא נשתנים
  if (updates.statusColors) {
    delete updates.statusColors;
  }
  
  return this.findOneAndUpdate(
    { type: 'tenant', tenantId },
    { 
      ...updates, 
      updatedBy: userId,
      type: 'tenant',
      tenantId,
    },
    { new: true, upsert: true }
  );
};

// מתודה סטטית - ספירת עסקים שמשתמשים בגלובלי
BrandingSettingsSchema.statics.countUsingGlobal = async function() {
  const Tenant = mongoose.model('Tenant');
  const totalTenants = await Tenant.countDocuments({ isActive: true });
  const customBranding = await this.countDocuments({ 
    type: 'tenant', 
    useGlobalBranding: false 
  });
  
  return {
    total: totalTenants,
    usingGlobal: totalTenants - customBranding,
    customized: customBranding,
  };
};

// JSON - כולל וירטואלים
BrandingSettingsSchema.set('toJSON', { virtuals: true });
BrandingSettingsSchema.set('toObject', { virtuals: true });

export default mongoose.models.BrandingSettings || mongoose.model('BrandingSettings', BrandingSettingsSchema);
