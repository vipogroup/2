import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema({
  // Multi-tenant support
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  
  // Basic info
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  
  // Status
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'converted', 'lost'],
    default: 'new',
  },
  
  // Pipeline Stage (Sales Funnel)
  pipelineStage: {
    type: String,
    enum: ['lead', 'contact', 'meeting', 'proposal', 'negotiation', 'won', 'lost'],
    default: 'lead',
  },
  
  // Estimated Value
  estimatedValue: {
    type: Number,
    default: 0,
  },
  
  // Segment
  segment: {
    type: String,
    enum: ['cold', 'warm', 'hot', 'vip'],
    default: 'cold',
  },
  
  // Priority Score (1-100)
  score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  
  // Source
  source: {
    type: String,
    enum: ['website', 'whatsapp', 'phone', 'referral', 'agent', 'manual', 'facebook', 'instagram', 'google', 'other'],
    default: 'manual',
  },
  
  // UTM tracking
  utm: {
    source: String,
    medium: String,
    campaign: String,
  },
  
  // Agent attribution
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  
  // Notes and tags
  notes: String,
  tags: [String],
  
  // Custom fields
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  
  // Conversion
  convertedToCustomer: {
    type: Boolean,
    default: false,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  convertedAt: Date,
  
  // Last contact
  lastContactAt: Date,
  nextFollowUpAt: Date,
  
  // SLA Tracking
  firstResponseAt: Date,
  slaDeadline: Date,
  slaStatus: {
    type: String,
    enum: ['pending', 'met', 'breached'],
    default: 'pending',
  },
  
  // Snooze / Deferred handling
  snoozedUntil: Date,
  snoozedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  snoozedReason: String,
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  
}, {
  timestamps: true,
});

// Indexes
LeadSchema.index({ tenantId: 1, status: 1 });
LeadSchema.index({ tenantId: 1, createdAt: -1 });
LeadSchema.index({ tenantId: 1, phone: 1 });
LeadSchema.index({ tenantId: 1, assignedTo: 1 });
LeadSchema.index({ tenantId: 1, slaStatus: 1, slaDeadline: 1 });
LeadSchema.index({ tenantId: 1, snoozedUntil: 1 });

// Virtual for conversation count
LeadSchema.virtual('conversations', {
  ref: 'Conversation',
  localField: '_id',
  foreignField: 'leadId',
});

export default mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
