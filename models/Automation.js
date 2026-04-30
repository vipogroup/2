import mongoose from 'mongoose';

const AutomationSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  
  name: {
    type: String,
    required: true,
    trim: true,
  },
  
  description: String,
  
  // Trigger type
  trigger: {
    type: {
      type: String,
      enum: ['lead_created', 'lead_status_change', 'no_contact', 'task_due', 'order_created', 'custom'],
      required: true,
    },
    conditions: {
      status: String,
      pipelineStage: String,
      segment: String,
      daysWithoutContact: Number,
    },
  },
  
  // Action to perform
  action: {
    type: {
      type: String,
      enum: ['send_message', 'create_task', 'update_lead', 'notify_user', 'webhook'],
      required: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MessageTemplate',
    },
    channel: String,
    taskTitle: String,
    taskType: String,
    assignTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    webhookUrl: String,
    updateFields: mongoose.Schema.Types.Mixed,
  },
  
  // Delay before action
  delayMinutes: {
    type: Number,
    default: 0,
  },
  
  isActive: {
    type: Boolean,
    default: true,
  },
  
  // Stats
  executionCount: {
    type: Number,
    default: 0,
  },
  lastExecutedAt: Date,
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
}, {
  timestamps: true,
});

AutomationSchema.index({ tenantId: 1, isActive: 1 });
AutomationSchema.index({ tenantId: 1, 'trigger.type': 1 });

export default mongoose.models.Automation || mongoose.model('Automation', AutomationSchema);
