import mongoose from 'mongoose';

const MessageTemplateSchema = new mongoose.Schema({
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
  
  category: {
    type: String,
    enum: ['welcome', 'follow_up', 'reminder', 'promotion', 'thank_you', 'custom'],
    default: 'custom',
  },
  
  channel: {
    type: String,
    enum: ['whatsapp', 'email', 'sms', 'all'],
    default: 'all',
  },
  
  subject: String, // For email
  
  content: {
    type: String,
    required: true,
  },
  
  // Variables like {{name}}, {{phone}}, {{product}}
  variables: [String],
  
  isActive: {
    type: Boolean,
    default: true,
  },
  
  usageCount: {
    type: Number,
    default: 0,
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
}, {
  timestamps: true,
});

MessageTemplateSchema.index({ tenantId: 1, category: 1 });
MessageTemplateSchema.index({ tenantId: 1, isActive: 1 });

export default mongoose.models.MessageTemplate || mongoose.model('MessageTemplate', MessageTemplateSchema);
