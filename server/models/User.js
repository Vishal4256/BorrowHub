import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['borrower', 'lender', 'admin'], default: 'borrower' },
    avatar: { type: String, default: '' },
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    trustTier: { type: String, default: 'Community Member' },
    bio: { type: String, default: 'BorrowHub community member.' },
    location: { type: String, default: '' },
    responseTime: { type: String, default: '< 30 mins' }
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.index({ role: 1, createdAt: -1 });

export default mongoose.model('User', userSchema);
