import mongoose from 'mongoose';

/**
 * System Report Model
 * לשמירת דוחות בדיקה ואינטגרציה של המערכת
 */

const SystemReportSchema = new mongoose.Schema(
  {
    // === Multi-Tenant ===
    tenantId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Tenant', 
      default: null,
      index: true,
    },
    
    // Basic Info
    title: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'integration',      // דוח אינטגרציה (Priority, PayPlus)
        'security',         // דוח אבטחה
        'performance',      // דוח ביצועים
        'audit',           // דוח ביקורת
        'backup',          // דוח גיבוי
        'custom',          // דוח מותאם אישית
      ],
      default: 'custom',
    },
    category: {
      type: String,
      default: 'general',
    },
    
    // Content
    summary: {
      type: String,
      default: '',
    },
    content: {
      type: String,        // Markdown content
      required: true,
    },
    contentHtml: {
      type: String,        // Pre-rendered HTML (optional)
      default: '',
    },
    
    // Metadata
    tags: [{
      type: String,
    }],
    version: {
      type: String,
      default: '1.0',
    },
    
    // Status
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
    },
    
    // Stats (for check reports)
    stats: {
      totalChecks: { type: Number, default: 0 },
      passed: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      warnings: { type: Number, default: 0 },
      score: { type: Number, default: 0 },     // 0-100
    },
    
    // Creator
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdByName: {
      type: String,
      default: 'System',
    },
    
    // File attachments (URLs)
    attachments: [{
      name: String,
      url: String,
      type: String,
      size: Number,
    }],
    
    // Related entities
    relatedOrders: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    }],
    relatedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
SystemReportSchema.index({ type: 1, createdAt: -1 });
SystemReportSchema.index({ status: 1 });
SystemReportSchema.index({ tags: 1 });
SystemReportSchema.index({ createdAt: -1 });

export default mongoose.models.SystemReport ||
  mongoose.model('SystemReport', SystemReportSchema);
