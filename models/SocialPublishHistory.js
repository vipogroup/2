import mongoose from 'mongoose';

const socialPublishHistorySchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null, index: true },
    productName: { type: String, default: '' },
    postKind: {
      type: String,
      enum: ['product', 'affiliate_recruitment', 'weekly_summary', 'story'],
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ['facebook_page', 'instagram_business'],
      required: true,
      index: true,
    },
    caption: { type: String, default: '' },
    hashtags: [{ type: String }],
    cta: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    mediaType: { type: String, enum: ['image', 'video', 'none'], default: 'none' },
    status: { type: String, enum: ['pending_approval', 'published', 'failed', 'skipped'], default: 'skipped', index: true },
    approvalMode: { type: Boolean, default: false },
    metaPostId: { type: String, default: '' },
    metaContainerId: { type: String, default: '' },
    publishedAt: { type: Date, default: null, index: true },
    scheduledFor: { type: Date, default: null },
    scheduledSlotHour: { type: Number, default: null },
    errorMessage: { type: String, default: '' },
    analytics: {
      impressions: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      syncedAt: { type: Date, default: null },
    },
    rawMeta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
    collection: 'social_publish_history',
  },
);

socialPublishHistorySchema.index({ productId: 1, platform: 1, publishedAt: -1 });
socialPublishHistorySchema.index({ postKind: 1, publishedAt: -1 });
socialPublishHistorySchema.index({ status: 1, createdAt: -1 });

const SocialPublishHistory =
  mongoose.models.SocialPublishHistory ||
  mongoose.model('SocialPublishHistory', socialPublishHistorySchema);

export default SocialPublishHistory;
