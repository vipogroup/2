import mongoose from 'mongoose';

const CrmTaskSchema = new mongoose.Schema({
  // Multi-tenant support
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  
  // Title and description
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: String,
  
  // Type
  type: {
    type: String,
    enum: ['follow_up', 'call', 'meeting', 'email', 'whatsapp', 'other'],
    default: 'follow_up',
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  
  // Due date
  dueAt: {
    type: Date,
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
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    index: true,
  },
  
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // Completion
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Reminder
  reminderAt: Date,
  reminderSent: {
    type: Boolean,
    default: false,
  },
  
}, {
  timestamps: true,
});

// Indexes
CrmTaskSchema.index({ tenantId: 1, status: 1 });
CrmTaskSchema.index({ tenantId: 1, assignedTo: 1, status: 1 });
CrmTaskSchema.index({ tenantId: 1, dueAt: 1 });
CrmTaskSchema.index({ dueAt: 1, status: 1 }); // For reminder queries

// Virtual for overdue check
CrmTaskSchema.virtual('isOverdue').get(function() {
  return this.status === 'pending' && this.dueAt < new Date();
});

export default mongoose.models.CrmTask || mongoose.model('CrmTask', CrmTaskSchema);
