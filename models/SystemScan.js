import mongoose from 'mongoose';

const systemScanSchema = new mongoose.Schema({
  // === Multi-Tenant ===
  tenantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tenant', 
    default: null,
    index: true,
  },
  
  // Scan identification
  scanId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  
  // Who initiated the scan
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  initiatedByName: {
    type: String,
    required: true,
  },
  
  // Scan scope and type
  scope: {
    type: String,
    enum: ['full', 'partial', 'targeted'],
    default: 'full',
  },
  
  // What areas were scanned
  scannedAreas: [{
    type: String,
    enum: [
      'screens',           // מסכים
      'documents',         // מסמכים
      'purchase_flows',    // זרימות רכישה
      'payment_data',      // נתוני תשלום
      'admin_dashboards',  // דשבורדי מנהל
      'permissions',       // הרשאות ותפקידים
      'integrations',      // אינטגרציות
      'system_keys',       // מפתחות מערכת
      'database',          // מסד נתונים
      'security',          // אבטחה
      'users',             // משתמשים
      'orders',            // הזמנות
      'products',          // מוצרים
      'transactions',      // עסקאות
    ],
  }],
  
  // Scan status
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  },
  
  // Progress tracking
  progress: {
    current: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
  },
  
  // Timing
  startedAt: Date,
  completedAt: Date,
  duration: Number, // milliseconds
  
  // Results summary
  results: {
    totalChecks: { type: Number, default: 0 },
    passed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    warnings: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
  },
  
  // Detailed findings (stored as JSON)
  findings: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  
  // Generated reports from this scan
  generatedReports: [{
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'SystemReport' },
    reportType: String,
    generatedAt: Date,
  }],
  
  // Error info if failed
  error: {
    message: String,
    stack: String,
    code: String,
  },
  
  // Metadata
  version: {
    type: String,
    default: '1.0',
  },
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    default: process.env.NODE_ENV || 'development',
  },
  
}, {
  timestamps: true,
});

// Indexes
systemScanSchema.index({ status: 1, createdAt: -1 });
systemScanSchema.index({ initiatedBy: 1, createdAt: -1 });
systemScanSchema.index({ createdAt: -1 });

// Generate unique scan ID
systemScanSchema.statics.generateScanId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `SCAN-${timestamp}-${random}`.toUpperCase();
};

// Instance methods
systemScanSchema.methods.markAsRunning = async function() {
  this.status = 'running';
  this.startedAt = new Date();
  await this.save();
};

systemScanSchema.methods.markAsCompleted = async function(results) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.duration = this.completedAt - this.startedAt;
  if (results) {
    this.results = results;
  }
  await this.save();
};

systemScanSchema.methods.markAsFailed = async function(error) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.duration = this.completedAt - (this.startedAt || this.createdAt);
  this.error = {
    message: error.message || String(error),
    stack: error.stack,
    code: error.code,
  };
  await this.save();
};

systemScanSchema.methods.updateProgress = async function(current, total) {
  this.progress = {
    current,
    total,
    percentage: Math.round((current / total) * 100),
  };
  await this.save();
};

systemScanSchema.methods.addGeneratedReport = async function(reportId, reportType) {
  this.generatedReports.push({
    reportId,
    reportType,
    generatedAt: new Date(),
  });
  await this.save();
};

// Get or create model
let SystemScan;
try {
  SystemScan = mongoose.model('SystemScan');
} catch {
  SystemScan = mongoose.model('SystemScan', systemScanSchema);
}

export default SystemScan;
