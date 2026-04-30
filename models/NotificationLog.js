import mongoose from 'mongoose';

const NotificationLogSchema = new mongoose.Schema(
  {
    // === Multi-Tenant ===
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
      index: true,
    },

    // === Template Info ===
    templateType: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      default: '',
    },

    // === Audience ===
    audienceType: {
      type: String,
      enum: ['broadcast', 'roles', 'tags', 'users'],
      required: true,
    },
    audienceTargets: {
      type: [String],
      default: [],
    },
    recipientCount: {
      type: Number,
      default: 0,
    },

    // === Recipient Details (for user-specific notifications) ===
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    recipientName: {
      type: String,
      default: null,
    },
    recipientRole: {
      type: String,
      enum: ['customer', 'agent', 'admin', 'business_admin', 'super_admin', null],
      default: null,
    },

    // === Status ===
    status: {
      type: String,
      enum: ['sent', 'failed', 'dry_run'],
      required: true,
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },

    // === Payload ===
    variables: {
      type: Object,
      default: {},
    },
    payload: {
      type: Object,
      default: {},
    },

    // === Metadata ===
    triggeredBy: {
      type: String,
      default: 'system',
    },
    source: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
NotificationLogSchema.index({ createdAt: -1 });
NotificationLogSchema.index({ templateType: 1, createdAt: -1 });
NotificationLogSchema.index({ status: 1, createdAt: -1 });
NotificationLogSchema.index({ tenantId: 1, createdAt: -1 });
NotificationLogSchema.index({ recipientRole: 1, createdAt: -1 });

// Text index for search
NotificationLogSchema.index({ title: 'text', body: 'text', recipientName: 'text' });

export default mongoose.models.NotificationLog || mongoose.model('NotificationLog', NotificationLogSchema);
