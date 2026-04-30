import mongoose from 'mongoose';

const SiteTextSchema = new mongoose.Schema({
  textId: {
    type: String,
    required: true,
    index: true,
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    index: true,
    default: null, // null = global texts for super admin
  },
  page: {
    type: String,
    required: true,
    index: true,
  },
  section: {
    type: String,
    required: true,
    index: true,
  },
  label: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    default: '',
  },
  defaultValue: {
    type: String,
    default: '',
  },
  previewLocation: {
    type: String,
    default: '',
  },
  fieldType: {
    type: String,
    enum: ['text', 'textarea', 'html'],
    default: 'text',
  },
  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Create compound indexes for efficient queries
SiteTextSchema.index({ page: 1, section: 1, order: 1 });
SiteTextSchema.index({ textId: 1, tenantId: 1 }, { unique: true });

export default mongoose.models.SiteText || mongoose.model('SiteText', SiteTextSchema);
