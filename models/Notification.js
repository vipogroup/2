import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    // === Multi-Tenant ===
    tenantId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Tenant', 
      default: null,
      index: true,
    },
    
    type: { type: String, enum: ['new_user', 'new_order'], required: true },
    message: { type: String, required: true },
    payload: { type: Object, default: {} },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
