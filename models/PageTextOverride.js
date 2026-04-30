import mongoose from 'mongoose';

const PageTextOverrideSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'global' },
  pageKey: { type: String, required: true },
  overrides: { type: mongoose.Schema.Types.Mixed, default: {} },
  buttonPos: {
    x: { type: Number, default: 8 },
    y: { type: Number, default: 8 },
    scale: { type: Number, default: 1 },
    locked: { type: Boolean, default: false }
  }
}, { timestamps: true });

PageTextOverrideSchema.index({ tenantId: 1, pageKey: 1 }, { unique: true });

export default mongoose.models.PageTextOverride || mongoose.model('PageTextOverride', PageTextOverrideSchema);
