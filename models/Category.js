// models/Category.js
import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema(
  {
    // === Multi-Tenant ===
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
      unique: true 
    },
    type: { 
      type: String, 
      enum: ['product'], 
      default: 'product' 
    },
    active: { 
      type: Boolean, 
      default: true 
    },
    sortOrder: { 
      type: Number, 
      default: 0 
    },
  },
  { timestamps: true }
);

CategorySchema.index({ name: 1, type: 1 });
CategorySchema.index({ active: 1, sortOrder: 1 });

export default mongoose.models.Category || mongoose.model('Category', CategorySchema);
