import mongoose from 'mongoose';

const equipmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    pricePerDay: { type: Number, required: true, min: 0 },
    retailValue: { type: Number, default: 0, min: 0 },
    deposit: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    distance: { type: String, default: '' },
    location: { type: String, required: true, trim: true },
    condition: { type: String, default: 'Like New' },
    instantBook: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    images: [{ type: String }],
    lender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Denormalized snapshot for fast query rendering if user unpopulated
    lenderSnapshot: {
      name: { type: String },
      avatar: { type: String },
      role: { type: String, default: 'Community Member' },
      trustTier: { type: String, default: 'Community Member' },
      responseTime: { type: String, default: '< 30 mins' }
    },
    description: { type: String, default: '' },
    includedAccessories: [{ type: String }],
    specs: [{ label: String, value: String }],
    tags: [{ type: String }]
  },
  { timestamps: true }
);

// Index for search queries
equipmentSchema.index({ title: 'text', description: 'text', category: 'text', tags: 'text' });

// Performance & Filtering Compound Indexes
equipmentSchema.index({ category: 1, isAvailable: 1 });
equipmentSchema.index({ lender: 1, createdAt: -1 });
equipmentSchema.index({ location: 1 });
equipmentSchema.index({ pricePerDay: 1 });
equipmentSchema.index({ createdAt: -1 });

export default mongoose.model('Equipment', equipmentSchema);
