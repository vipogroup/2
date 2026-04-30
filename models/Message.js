import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    // === Multi-Tenant ===
    tenantId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Tenant', 
      default: null,
      index: true,
    },
    
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['admin', 'super_admin', 'business_admin', 'agent', 'customer'], required: true },
    targetRole: {
      type: String,
      enum: ['admin', 'super_admin', 'business_admin', 'agent', 'customer', 'all', 'direct'],
      default: 'admin',
    },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    message: { type: String, required: true, maxlength: 2000 },
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ targetRole: 1, createdAt: -1 });
MessageSchema.index({ targetUserId: 1, createdAt: -1 });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
