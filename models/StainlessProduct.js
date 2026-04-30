import mongoose from 'mongoose';

const StainlessProductSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '' },
    description: { type: String, default: '' },
    price: { type: Number, default: 0 },
    images: { type: [String], default: [] },
    category: { type: String, trim: true, default: '' },
    tenantId: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

export default mongoose.models.StainlessProduct ||
  mongoose.model('StainlessProduct', StainlessProductSchema);
