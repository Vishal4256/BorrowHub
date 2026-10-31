import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewerName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

export default mongoose.model('Review', reviewSchema);
