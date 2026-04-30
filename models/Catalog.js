import mongoose from 'mongoose';
import { normalizeSlug } from '@/lib/slugify';

const CatalogSchema = new mongoose.Schema(
  {
    // === Multi-Tenant ===
    tenantId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Tenant', 
      default: null,
      index: true,
    },
    
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    sourcePdf: { type: String, default: '' },
    sourceJson: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

CatalogSchema.pre('validate', function catalogPreValidate(next) {
  if (this.name) {
    this.name = this.name.trim();
  }

  if (!this.slug && this.name) {
    this.slug = normalizeSlug(this.name);
  }

  if (this.slug) {
    this.slug = normalizeSlug(this.slug);
  }

  if (!this.name) {
    this.invalidate('name', 'Catalog name is required');
  }
  if (!this.slug) {
    this.invalidate('slug', 'Catalog slug is required');
  }

  next();
});

CatalogSchema.index({ active: 1, sortOrder: 1 });

export default mongoose.models.Catalog || mongoose.model('Catalog', CatalogSchema);
