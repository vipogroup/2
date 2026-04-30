import mongoose from 'mongoose';

const CatalogTemplateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    titlePrefix: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    shortDescription: {
      type: String,
      default: '',
      trim: true,
    },
    specs: {
      type: String,
      default: '',
      trim: true,
    },
    faq: {
      type: String,
      default: '',
      trim: true,
    },
    structuredData: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      default: '',
      trim: true,
    },
    subCategory: {
      type: String,
      default: '',
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    seo: {
      slugPrefix: { type: String, default: '', trim: true },
      metaTitle: { type: String, default: '', trim: true },
      metaDescription: { type: String, default: '', trim: true },
      keywords: { type: [String], default: [] },
    },
    /** Extra HTML/text per catalog mode — merged into Product.fullDescription on import (see lib/catalogTemplatePurchaseMode.js). */
    purchaseModeBlocks: {
      stock: { type: String, default: '' },
      group: { type: String, default: '' },
      shared_container: { type: String, default: '' },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

CatalogTemplateSchema.index({ tenantId: 1, key: 1 }, { unique: true });
CatalogTemplateSchema.index({ isActive: 1 });

export default mongoose.models.CatalogTemplate ||
  mongoose.model('CatalogTemplate', CatalogTemplateSchema);
