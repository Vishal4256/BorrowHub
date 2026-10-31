import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Equipment from './models/Equipment.js';
import Booking from './models/Booking.js';
import Review from './models/Review.js';
import Message from './models/Message.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/borrowhub';

export async function seedDatabase(options = {}) {
  // Prevent accidental execution in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: Database seed script cannot be executed in production environment.');
  }

  const isOptIn =
    options.force ||
    process.env.ALLOW_SEED === 'true' ||
    process.argv.includes('--force') ||
    process.env.NODE_ENV === 'test';

  if (!isOptIn) {
    console.warn(
      'BorrowHub Seed Guard: Seeding skipped. Normal startup maintains a clean database. ' +
      'To populate optional mock development data, explicitly run with: ALLOW_SEED=true npm run seed -- --force'
    );
    return false;
  }

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB for optional development seeding...');

  // Clear existing collections
  await User.deleteMany({});
  await Equipment.deleteMany({});
  await Booking.deleteMany({});
  await Review.deleteMany({});
  await Message.deleteMany({});

  console.log('Cleared collections for development seed.');

  // 1. Create Users
  const borrower = await User.create({
    name: 'Dev Borrower',
    email: 'borrower@borrowhub.local',
    password: 'Password123!',
    role: 'borrower',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    trustTier: 'Verified Member',
    rating: 5.0,
    bio: 'Student & documentary enthusiast. Frequent borrower of camera gear and camping rigs.',
    location: 'North Campus Hub'
  });

  const lender = await User.create({
    name: 'Dev Lender',
    email: 'lender@borrowhub.local',
    password: 'Password123!',
    role: 'lender',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    trustTier: 'Verified Pro Lender',
    rating: 5.0,
    bio: 'Media Lab specialist & woodworker. Passionate about community tool libraries and gear circulation.',
    location: 'Downtown Community Hub',
    responseTime: '< 15 mins'
  });

  const admin = await User.create({
    name: 'System Admin',
    email: 'admin@borrowhub.local',
    password: 'AdminPassword123!',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
    trustTier: 'System Trust Administrator',
    rating: 5.0,
    bio: 'BorrowHub Platform Administrator and Trust & Safety Lead.',
    location: 'Central Admin Node'
  });

  console.log('Created dev users:');
  console.log(` - Borrower: ${borrower.email}`);
  console.log(` - Lender:   ${lender.email}`);
  console.log(` - Admin:    ${admin.email}`);

  // 2. Create Equipment Listing
  const devItem = await Equipment.create({
    title: 'Sony Alpha 7 IV Mirrorless Kit + FE 24-70mm f/2.8 GM Lens',
    category: 'Photography & Video',
    pricePerDay: 48,
    retailValue: 3498,
    deposit: 150,
    rating: 5.0,
    reviewsCount: 1,
    distance: '',
    location: 'Downtown Community Hub',
    condition: 'Like New',
    instantBook: true,
    images: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=80'
    ],
    lender: lender._id,
    lenderSnapshot: {
      name: lender.name,
      avatar: lender.avatar,
      role: 'Community Pro Lender',
      trustTier: lender.trustTier,
      responseTime: lender.responseTime
    },
    description: 'Fully loaded 33MP Full-Frame cinema and photography camera with 24-70mm f/2.8 GM lens.',
    includedAccessories: [
      'Sony FE 24-70mm f/2.8 G Master Lens',
      '2x Sony NP-FZ100 Batteries',
      'Rapid Charger'
    ],
    specs: [
      { label: 'Sensor', value: '33.0 Megapixel Exmor R BSI CMOS' },
      { label: 'Video', value: '4K 60p 10-bit 4:2:2' }
    ],
    tags: ['Cinema', '4K Video', 'Full-Frame', 'Photography']
  });

  console.log('Dev seed completed successfully.');
  return true;
}

// Run directly if script executed via node
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}
