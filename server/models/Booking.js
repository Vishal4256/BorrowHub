import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, required: true, unique: true, index: true },
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Equipment',
      required: true
    },
    equipmentTitle: { type: String, required: true },
    equipmentImage: { type: String },
    borrower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    borrowerName: { type: String, required: true },
    lender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lenderName: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'active', 'completed', 'cancelled', 'rejected'],
      default: 'pending',
      index: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    pickupDate: { type: String, required: true }, // Display string
    returnDate: { type: String, required: true }, // Display string
    days: { type: Number, required: true, min: 1 },
    dailyRate: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    serviceFee: { type: Number, default: 0 },
    insuranceFee: { type: Number, default: 0 },
    depositHeld: { type: Number, default: 0 },
    totalPaid: { type: Number, required: true },

    // Explicitly labeled simulated physical/payment integrations
    paymentStatus: {
      type: String,
      enum: ['simulated_pending', 'simulated_authorized', 'simulated_captured', 'simulated_refunded'],
      default: 'simulated_authorized'
    },
    paymentGatewayNote: {
      type: String,
      default: 'Simulated Sandbox Authorization (Prototype Mode - No real payment gateway configured)'
    },
    smartLockerStatus: {
      type: String,
      enum: ['simulated_standby', 'simulated_ready', 'simulated_unlocked', 'simulated_locked_return', 'simulated_returned'],
      default: 'simulated_ready'
    },
    lockerPin: { type: String },
    lockerLocation: { type: String },
    
    // Condition scan results (honestly labeled as simulated visual inspection)
    conditionScan: {
      completed: { type: Boolean, default: false },
      status: { type: String, default: 'simulated_verified' },
      notes: { type: String, default: 'Pre-inspection visual match confirmed by simulated vision model' },
      photosProof: [{ type: String }]
    },

    handoverChecklist: [
      {
        item: { type: String },
        verified: { type: Boolean, default: false }
      }
    ],
    
    cancellationReason: { type: String },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

// Compound Indexes for conflict queries, borrower history, and lender studio
bookingSchema.index({ equipment: 1, status: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ borrower: 1, status: 1, createdAt: -1 });
bookingSchema.index({ lender: 1, status: 1, createdAt: -1 });
bookingSchema.index({ createdAt: -1 });

export default mongoose.model('Booking', bookingSchema);
