import express from 'express';
import Equipment from '../models/Equipment.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';

const router = express.Router();

// GET /api/stats - Real metrics calculated from MongoDB collections
router.get('/', async (req, res) => {
  try {
    const totalEquipment = await Equipment.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const activeBookings = await Booking.countDocuments({ status: { $in: ['approved', 'active'] } });
    const completedBookings = await Booking.find({ status: 'completed' });

    // Real community savings: calculated from actual completed bookings or gear retail value
    let totalCommunitySavings = 0;
    completedBookings.forEach((b) => {
      // Estimated savings = retail value (or 20x rate) minus rental paid
      const estRetail = b.dailyRate * 25;
      totalCommunitySavings += Math.max(0, estRetail - b.totalPaid);
    });

    // Real CO2 saved estimate: 1.2 kg CO2 avoided per community borrow day
    const totalBorrowDays = completedBookings.reduce((sum, b) => sum + (b.days || 1), 0);
    const co2SavedKg = Math.round(totalBorrowDays * 1.2);

    res.json({
      totalEquipment,
      totalUsers,
      totalBookings,
      activeBookings,
      completedBookingsCount: completedBookings.length,
      totalCommunitySavings: Math.round(totalCommunitySavings),
      co2SavedKg,
      calculatedFromDatabase: true
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate stats', details: err.message });
  }
});

export default router;
