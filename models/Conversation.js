import mongoose from 'mongoose';

const InteractionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['message', 'note', 'call', 'whatsapp', 'email', 'system'],
    required: true,
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound', 'internal'],
    default: 'internal',
  },
  content: {
    type: String,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

const ConversationSchema = new mongoose.Schema({
  // Multi-tenant support
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  
  // Related entities
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    index: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  
  // Channel
  channel: {
    type: String,
    enum: ['website', 'whatsapp', 'phone', 'email', 'internal'],
    required: true,
  },
  
  // Status
  status: {
    type: String,
    enum: ['new', 'open', 'pending', 'waiting', 'resolved', 'closed', 'spam'],
    default: 'new',
  },
  
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  
  // Subject/Title
  subject: String,
  
  // Contact info (for anonymous conversations)
  contactName: String,
  contactPhone: String,
  contactEmail: String,
  
  // Interactions (messages, notes, etc.)
  interactions: [InteractionSchema],
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  
  // Timestamps
  lastMessageAt: Date,
  resolvedAt: Date,
  
  // Tags
  tags: [String],
  
}, {
  timestamps: true,
});

// Indexes
ConversationSchema.index({ tenantId: 1, status: 1 });
ConversationSchema.index({ tenantId: 1, channel: 1 });
ConversationSchema.index({ tenantId: 1, assignedTo: 1 });
ConversationSchema.index({ tenantId: 1, createdAt: -1 });
ConversationSchema.index({ tenantId: 1, lastMessageAt: -1 });

// Update lastMessageAt when adding interaction
ConversationSchema.methods.addInteraction = function(interaction) {
  this.interactions.push(interaction);
  this.lastMessageAt = new Date();
  if (this.status === 'new') {
    this.status = 'open';
  }
  return this.save();
};

export default mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
