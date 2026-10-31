import express from 'express';
import mongoose from 'mongoose';
import Equipment from '../models/Equipment.js';
import Booking from '../models/Booking.js';
import { protect } from '../middleware/auth.js';
import { isValidImageUrl } from '../utils/urlValidator.js';

const router = express.Router();

// GET /api/equipment - Query real database items with pagination support
router.get('/', async (req, res) => {
  try {
    const { search, category, maxPrice, instantBook, lender, location } = req.query;
    const filter = {};

    if (category && category !== 'All Equipment' && category !== 'All' && category !== 'all') {
      filter.category = category;
    }

    if (maxPrice && !isNaN(Number(maxPrice))) {
      filter.pricePerDay = { $lte: Number(maxPrice) };
    }

    if (instantBook === 'true') {
      filter.instantBook = true;
    }

    if (lender && mongoose.Types.ObjectId.isValid(lender)) {
      filter.lender = lender;
    }

    if (location && location.trim() && location !== 'All Locations') {
      filter.location = new RegExp(location.trim(), 'i');
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: regex },
        { description: regex },
        { category: regex },
        { tags: regex },
        { location: regex }
      ];
    }

    // Pagination with safe limits
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Equipment.find(filter)
        .populate('lender', 'name avatar trustTier rating location responseTime')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Equipment.countDocuments(filter)
    ]);

    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Page', page);
    res.setHeader('X-Total-Pages', Math.ceil(total / limit) || 1);

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch equipment listings', details: err.message });
  }
});

// GET /api/equipment/:id
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid equipment ID format' });
    }

    const item = await Equipment.findById(req.params.id).populate(
      'lender',
      'name avatar trustTier rating bio location responseTime'
    );

    if (!item) {
      return res.status(404).json({ error: 'Equipment listing not found' });
    }

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Error retrieving equipment listing', details: err.message });
  }
});

// POST /api/equipment - Create new listing (Authenticated)
router.post('/', protect, async (req, res) => {
  try {
    const {
      title,
      category,
      pricePerDay,
      retailValue,
      deposit,
      distance,
      location,
      condition,
      instantBook,
      images,
      description,
      includedAccessories,
      specs,
      tags
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Equipment title is required.' });
    }

    if (title.trim().length > 120) {
      return res.status(400).json({ error: 'Equipment title cannot exceed 120 characters.' });
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
      return res.status(400).json({ error: 'Equipment category is required.' });
    }

    if (pricePerDay === undefined || isNaN(Number(pricePerDay)) || Number(pricePerDay) < 0) {
      return res.status(400).json({ error: 'A valid non-negative price per day is required.' });
    }

    if (!location || typeof location !== 'string' || !location.trim()) {
      return res.status(400).json({ error: 'Pickup location is required.' });
    }

    // Validate image URLs
    const sanitizedImages = [];
    if (images && Array.isArray(images)) {
      for (const img of images) {
        if (img && typeof img === 'string') {
          if (!isValidImageUrl(img)) {
            return res.status(400).json({ error: `Invalid image URL or unsupported format: ${img}` });
          }
          sanitizedImages.push(img.trim());
        }
      }
    }

    const finalImages = sanitizedImages.length > 0 ? sanitizedImages : [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80'
    ];

    const item = new Equipment({
      title: title.trim(),
      category: category.trim(),
      pricePerDay: Number(pricePerDay),
      retailValue: Math.max(0, Number(retailValue || 0)),
      deposit: Math.max(0, Number(deposit || 0)),
      distance: distance ? distance.trim() : '',
      location: location.trim(),
      condition: condition || 'Like New',
      instantBook: instantBook !== undefined ? Boolean(instantBook) : true,
      images: finalImages,
      description: description ? description.trim() : '',
      includedAccessories: Array.isArray(includedAccessories) ? includedAccessories : [],
      specs: Array.isArray(specs) ? specs : [],
      tags: Array.isArray(tags) && tags.length > 0 ? tags : [category],
      lender: req.user._id,
      lenderSnapshot: {
        name: req.user.name,
        avatar: req.user.avatar || '',
        role: req.user.role === 'lender' ? 'Community Pro Lender' : 'Community Member',
        trustTier: req.user.trustTier || 'Verified Member',
        responseTime: req.user.responseTime || '< 30 mins'
      }
    });

    const saved = await item.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create equipment listing', details: err.message });
  }
});

// PUT /api/equipment/:id - Update listing (Owner or Admin only)
router.put('/:id', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid equipment ID format' });
    }

    const item = await Equipment.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Equipment listing not found' });
    }

    // Ownership check
    if (item.lender.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to edit this listing.' });
    }

    // Validate images if provided in update
    if (req.body.images && Array.isArray(req.body.images)) {
      for (const img of req.body.images) {
        if (!isValidImageUrl(img)) {
          return res.status(400).json({ error: `Invalid image URL or unsupported format: ${img}` });
        }
      }
    }

    // Do not allow reassigning lender ownership
    delete req.body.lender;
    delete req.body._id;

    Object.assign(item, req.body);
    const updated = await item.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update equipment listing', details: err.message });
  }
});

// DELETE /api/equipment/:id - Delete listing (Owner or Admin only)
router.delete('/:id', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid equipment ID format' });
    }

    const item = await Equipment.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Equipment listing not found' });
    }

    // Ownership check
    if (item.lender.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this listing.' });
    }

    // Check for active or pending bookings on this equipment
    const activeBooking = await Booking.findOne({
      equipment: req.params.id,
      status: { $in: ['pending', 'approved', 'active'] }
    });
    if (activeBooking) {
      return res.status(400).json({
        error: 'Cannot delete equipment with active or pending bookings. Complete or cancel outstanding bookings first.'
      });
    }

    await Equipment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Equipment listing deleted from database.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete equipment listing', details: err.message });
  }
});

export default router;
