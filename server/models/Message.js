import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    text: { type: String, required: true, trim: true },
    isSystem: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Compound Indexes for fast chat thread retrieval & security filtering
messageSchema.index({ sender: 1, recipient: 1, createdAt: 1 });
messageSchema.index({ recipient: 1, sender: 1, createdAt: 1 });
messageSchema.index({ booking: 1 });
messageSchema.index({ createdAt: -1 });

export default mongoose.model('Message', messageSchema);
