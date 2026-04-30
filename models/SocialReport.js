import mongoose from 'mongoose';

const socialIssueSchema = new mongoose.Schema({
  page_url: { type: String, required: true },
  issue_type: { type: String }, // missing_tag, invalid_tag, headers, redirect, crawl, orphan
  tag_type: { type: String }, // og, twitter, meta
  platform: { type: String }, // facebook, whatsapp, linkedin, twitter
  severity: { type: String, enum: ['critical', 'warning', 'info'], default: 'warning' },
  detected_value: { type: String },
  expected_value: { type: String },
  issue_description: { type: String },
  recommended_fix: { type: String },
  technical_fix_hint: { type: String },
}, { _id: false });

const pageMetadataSchema = new mongoose.Schema({
  url: { type: String, required: true },
  // Open Graph
  og_title: { type: String },
  og_description: { type: String },
  og_image: { type: String },
  og_url: { type: String },
  og_type: { type: String },
  // Twitter Cards
  twitter_card: { type: String },
  twitter_title: { type: String },
  twitter_description: { type: String },
  twitter_image: { type: String },
  // Standard meta
  title: { type: String },
  meta_description: { type: String },
  // Image validation
  image_valid: { type: Boolean },
  image_format: { type: String },
  image_dimensions: { type: String },
  image_size_kb: { type: Number },
  image_status: { type: Number }, // HTTP status code
  // Consistency check
  is_consistent: { type: Boolean },
  consistency_issues: [{ type: String }],
}, { _id: false });

const previewDataSchema = new mongoose.Schema({
  url: { type: String, required: true },
  platform: { type: String, required: true }, // facebook, whatsapp, linkedin, twitter
  preview_status: { type: String, enum: ['ok', 'broken', 'partial'], default: 'ok' },
  preview_title: { type: String },
  preview_description: { type: String },
  preview_image: { type: String },
  cache_status: { type: String }, // fresh, stale, not_cached
  redirect_chain: [{ type: String }],
  issues: [{ type: String }],
}, { _id: false });

const crawlDataSchema = new mongoose.Schema({
  url: { type: String, required: true },
  http_status: { type: Number },
  cache_control: { type: String },
  content_type: { type: String },
  redirect_chain: [{ type: String }],
  robots_meta: { type: String },
  is_indexable: { type: Boolean },
  in_sitemap: { type: Boolean },
  share_depth: { type: Number }, // clicks from homepage
  is_orphan: { type: Boolean },
  issues: [{ type: String }],
}, { _id: false });

const socialReportSchema = new mongoose.Schema({
  // === Multi-Tenant ===
  tenantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tenant', 
    default: null,
    index: true,
  },
  
  // Report identification
  reportId: { type: String, required: true, unique: true },
  scanId: { type: String }, // Link to system scan if applicable
  reportType: { 
    type: String, 
    required: true,
    enum: ['social_metadata_audit', 'social_preview_shareability', 'social_crawlability_discovery']
  },
  
  // Report metadata
  title: { type: String, required: true },
  description: { type: String },
  
  // Overall status
  status: { type: String, enum: ['PASS', 'WARN', 'FAIL'], default: 'PASS' },
  score: { type: Number, min: 0, max: 100 },
  isSocialReady: { type: Boolean, default: false },
  
  // Summary counts
  summary: {
    totalPages: { type: Number, default: 0 },
    pagesChecked: { type: Number, default: 0 },
    totalIssues: { type: Number, default: 0 },
    criticalIssues: { type: Number, default: 0 },
    warningIssues: { type: Number, default: 0 },
    infoIssues: { type: Number, default: 0 },
    passedChecks: { type: Number, default: 0 },
    failedChecks: { type: Number, default: 0 },
  },
  
  // Detailed error log
  issues: [socialIssueSchema],
  
  // Page-specific data (for metadata audit)
  pagesMetadata: [pageMetadataSchema],
  
  // Preview data (for shareability report)
  previewData: [previewDataSchema],
  
  // Crawl data (for crawlability report)
  crawlData: [crawlDataSchema],
  
  // Platform-specific summaries
  platformSummary: {
    facebook: { status: String, issues: Number },
    whatsapp: { status: String, issues: Number },
    linkedin: { status: String, issues: Number },
    twitter: { status: String, issues: Number },
  },
  
  // Generation info
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  generatedByName: { type: String },
  trigger: { type: String, enum: ['manual', 'full_scan', 'scheduled'], default: 'manual' },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  // Export tracking
  exports: [{
    format: { type: String, enum: ['json', 'html', 'md'] },
    exportedAt: { type: Date },
    exportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
}, {
  timestamps: true,
  collection: 'social_reports',
});

// Indexes for efficient queries
socialReportSchema.index({ reportType: 1, createdAt: -1 });
socialReportSchema.index({ status: 1 });
socialReportSchema.index({ scanId: 1 });
socialReportSchema.index({ 'issues.severity': 1 });
socialReportSchema.index({ 'issues.platform': 1 });

// Virtual for formatted date
socialReportSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
});

// Method to calculate overall status
socialReportSchema.methods.calculateStatus = function() {
  if (this.summary.criticalIssues > 0) {
    this.status = 'FAIL';
    this.isSocialReady = false;
  } else if (this.summary.warningIssues > 0) {
    this.status = 'WARN';
    this.isSocialReady = false;
  } else {
    this.status = 'PASS';
    this.isSocialReady = true;
  }
  
  // Calculate score
  const totalChecks = this.summary.passedChecks + this.summary.failedChecks;
  this.score = totalChecks > 0 ? Math.round((this.summary.passedChecks / totalChecks) * 100) : 100;
  
  return this;
};

// Prevent model recompilation
const SocialReport = mongoose.models.SocialReport || mongoose.model('SocialReport', socialReportSchema);

export default SocialReport;
