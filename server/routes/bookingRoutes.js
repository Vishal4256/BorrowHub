import express from 'express';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Equipment from '../models/Equipment.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Helper to sanitize booking object based on user role and booking status
const sanitizeBooking = (booking, userId, isAdmin) => {
  const b = booking.toObject ? booking.toObject() : { ...booking };
  const borrowerId = b.borrower?._id ? b.borrower._id.toString() : b.borrower?.toString();
  const isBorrower = borrowerId === userId.toString();

  // Security: Do not expose locker PIN to borrower if request is still pending approval
  if (b.status === 'pending' && isBorrower && !isAdmin) {
    delete b.lockerPin;
  }
  return b;
};

// GET /api/bookings - Get user's bookings (as borrower or lender)
router.get('/', protect, async (req, res) => {
  try {
    const { role } = req.query;
    let query = {};

    if (req.user.role === 'admin') {
      if (role === 'borrower') query.borrower = req.user._id;
      if (role === 'lender') query.lender = req.user._id;
    } else {
      if (role === 'borrower') {
        query.borrower = req.user._id;
      } else if (role === 'lender') {
        query.lender = req.user._id;
      } else {
        query.$or = [{ borrower: req.user._id }, { lender: req.user._id }];
      }
    }

    // Pagination support
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('equipment', 'title category pricePerDay images location deposit')
        .populate('borrower', 'name email avatar rating trustTier location')
        .populate('lender', 'name email avatar rating trustTier location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(query)
    ]);

    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Page', page);
    res.setHeader('X-Total-Pages', Math.ceil(total / limit) || 1);

    const sanitized = bookings.map((b) => sanitizeBooking(b, req.user._id, req.user.role === 'admin'));
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve bookings', details: err.message });
  }
});

// GET /api/bookings/:id
router.get('/:id', protect, async (req, res) => {
  try {
    let booking;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      booking = await Booking.findById(req.params.id)
        .populate('equipment')
        .populate('borrower', 'name email avatar rating trustTier location')
        .populate('lender', 'name email avatar rating trustTier location');
    }

    if (!booking) {
      booking = await Booking.findOne({ bookingCode: req.params.id })
        .populate('equipment')
        .populate('borrower', 'name email avatar rating trustTier location')
        .populate('lender', 'name email avatar rating trustTier location');
    }

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Authorization check
    const isBorrower = booking.borrower._id.toString() === req.user._id.toString();
    const isLender = booking.lender._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isBorrower && !isLender && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: You are not authorized to view this booking' });
    }

    res.json(sanitizeBooking(booking, req.user._id, isAdmin));
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve booking', details: err.message });
  }
});

// POST /api/bookings - Create new booking request with concurrency & overlap check
router.post('/', protect, async (req, res) => {
  try {
    const { equipmentId, startDate, endDate, pickupDate, returnDate } = req.body;

    if (!equipmentId || !mongoose.Types.ObjectId.isValid(equipmentId)) {
      return res.status(400).json({ error: 'A valid equipmentId is required.' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required.' });
    }

    const equipment = await Equipment.findById(equipmentId).populate('lender');
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment listing not found' });
    }

    // Check that borrower is not renting their own item
    if (equipment.lender._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot borrow your own equipment listing.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ error: 'Invalid start or end date.' });
    }

    // CONCURRENCY & OVERLAP CHECK: Prevent double booking confirmed requests
    const overlapping = await Booking.findOne({
      equipment: equipment._id,
      status: { $in: ['approved', 'active'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (overlapping) {
      return res.status(409).json({
        error: 'Booking conflict: This equipment is already booked and confirmed for overlapping dates.',
        conflict: {
          existingBookingCode: overlapping.bookingCode,
          from: overlapping.startDate,
          to: overlapping.endDate
        }
      });
    }

    // Calculate days & pricing
    const diffMs = Math.max(1, end.getTime() - start.getTime());
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const dailyRate = equipment.pricePerDay;
    const subtotal = dailyRate * days;
    const serviceFee = Math.round(subtotal * 0.08 * 100) / 100;
    const insuranceFee = 5.0; // Flat BorrowGuard underwriting fee
    const depositHeld = equipment.deposit || 0;
    const totalPaid = Math.round((subtotal + serviceFee + insuranceFee) * 100) / 100;

    const bookingCode = 'BH-' + Math.floor(10000 + Math.random() * 90000);
    const initialStatus = equipment.instantBook ? 'approved' : 'pending';

    // PIN is generated immediately only for instantBook; otherwise generated upon lender approval
    const generatedPin = equipment.instantBook ? String(Math.floor(1000 + Math.random() * 9000)) : undefined;
    const pickupLoc = equipment.location ? `${equipment.location} — Designated Locker Point` : 'Designated Locker Point';

    const booking = new Booking({
      bookingCode,
      equipment: equipment._id,
      equipmentTitle: equipment.title,
      equipmentImage: equipment.images?.[0] || '',
      borrower: req.user._id,
      borrowerName: req.user.name,
      lender: equipment.lender._id,
      lenderName: equipment.lender.name || equipment.lenderSnapshot?.name || 'Community Lender',
      status: initialStatus,
      startDate: start,
      endDate: end,
      pickupDate: pickupDate || start.toDateString(),
      returnDate: returnDate || end.toDateString(),
      days,
      dailyRate,
      subtotal,
      serviceFee,
      insuranceFee,
      depositHeld,
      totalPaid,
      paymentStatus: 'simulated_authorized',
      paymentGatewayNote: 'Simulated Sandbox Authorization (Prototype Mode - No real payment gateway configured)',
      smartLockerStatus: 'simulated_ready',
      lockerPin: generatedPin,
      lockerLocation: pickupLoc,
      handoverChecklist: [
        { item: 'Battery & Charger Inspection', verified: false },
        { item: 'Accessories & Protective Case Check', verified: false },
        { item: 'Operating Guide & Inspection Check', verified: false }
      ]
    });

    const saved = await booking.save();
    res.status(201).json(sanitizeBooking(saved, req.user._id, req.user.role === 'admin'));
  } catch (err) {
    res.status(500).json({ error: 'Failed to create booking', details: err.message });
  }
});

// PATCH /api/bookings/:id/status - Manage booking lifecycle
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status, reason, checklist, conditionScanProof } = req.body;
    const validStatuses = ['approved', 'active', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const isBorrower = booking.borrower.toString() === req.user._id.toString();
    const isLender = booking.lender.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isBorrower && !isLender && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: You are not a party to this booking' });
    }

    // Role-based state transition validation
    if (status === 'approved') {
      if (!isLender && !isAdmin) {
        return res.status(403).json({ error: 'Only the lender or admin can approve booking requests.' });
      }
      if (booking.status !== 'pending') {
        return res.status(400).json({ error: `Cannot approve booking with status "${booking.status}". Only pending bookings can be approved.` });
      }

      // Re-verify concurrency before approving
      const conflict = await Booking.findOne({
        _id: { $ne: booking._id },
        equipment: booking.equipment,
        status: { $in: ['approved', 'active'] },
        $or: [
          { startDate: { $lte: booking.endDate }, endDate: { $gte: booking.startDate } }
        ]
      });

      if (conflict) {
        return res.status(409).json({ error: 'Cannot approve: Equipment has already been booked for these dates.' });
      }

      // Generate dynamic PIN on approval if not already set
      if (!booking.lockerPin) {
        booking.lockerPin = String(Math.floor(1000 + Math.random() * 9000));
      }
    }

    if (status === 'cancelled') {
      if (booking.status === 'completed') {
        return res.status(400).json({ error: 'Cannot cancel an already completed booking.' });
      }
      booking.cancellationReason = reason || (isBorrower ? 'Cancelled by borrower' : 'Declined by lender');
      booking.cancelledBy = req.user._id;
      booking.paymentStatus = 'simulated_refunded';
    }

    if (status === 'active') {
      if (!isBorrower && !isAdmin) {
        return res.status(403).json({ error: 'Only the borrower or admin can confirm gear pickup.' });
      }
      if (booking.status !== 'approved') {
        return res.status(400).json({ error: `Cannot activate booking with status "${booking.status}". Booking must be approved first.` });
      }
      booking.smartLockerStatus = 'simulated_unlocked';
    }

    if (status === 'completed') {
      if (booking.status !== 'active') {
        return res.status(400).json({ error: `Cannot complete booking with status "${booking.status}". Booking must be active first.` });
      }
      booking.smartLockerStatus = 'simulated_locked_return';
      booking.paymentStatus = 'simulated_captured';
      if (conditionScanProof) {
        booking.conditionScan = {
          completed: true,
          status: 'simulated_verified',
          notes: 'Post-return visual inspection match confirmed. No physical damage detected.',
          photosProof: Array.isArray(conditionScanProof) ? conditionScanProof : [conditionScanProof]
        };
      }
    }

    if (checklist) {
      booking.handoverChecklist = checklist;
    }

    booking.status = status;
    const updated = await booking.save();
    res.json(sanitizeBooking(updated, req.user._id, isAdmin));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update booking status', details: err.message });
  }
});

export default router;
