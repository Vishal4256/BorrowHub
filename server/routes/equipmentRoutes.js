import express from 'express';
import mongoose from 'mongoose';
import Equipment from '../models/Equipment.js';
import Booking from '../models/Booking.js';
import { protect } from '../middleware/auth.js';
import { isValidImageUrl } from '../utils/urlValidator.js';
import {
  validateLatLng,
  normalizeLocationInput,
  parseCoordinate
} from '../utils/locationValidator.js';

const router = express.Router();

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parsePositiveInt(value, defaultVal) {
  if (value === undefined || value === null || value === '') return { valid: true, value: defaultVal };
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) {
    return { valid: false, error: 'Pagination parameters page and limit must be positive integers.' };
  }
  return { valid: true, value: num };
}

// GET /api/equipment/nearby - Geospatial nearby equipment search using 2dsphere index
router.get('/nearby', async (req, res) => {
  try {
    const rawLat = req.query.lat ?? req.query.latitude;
    const rawLng = req.query.lng ?? req.query.longitude;

    const coordCheck = validateLatLng(rawLat, rawLng);
    if (!coordCheck.valid) {
      return res.status(400).json({ error: coordCheck.error });
    }

    const rawRadius = req.query.radius ?? req.query.radiusKm;
    let radiusKm = 25;
    if (rawRadius !== undefined && rawRadius !== '') {
      const parsedRadius = parseCoordinate(rawRadius);
      if (Number.isNaN(parsedRadius) || parsedRadius <= 0 || parsedRadius > 500) {
        return res.status(400).json({
          error: 'Invalid radius. Radius in kilometres must be a finite number greater than 0 and at most 500.'
        });
      }
      radiusKm = parsedRadius;
    }

    const pageCheck = parsePositiveInt(req.query.page, 1);
    const limitCheck = parsePositiveInt(req.query.limit, 12);
    if (!pageCheck.valid || !limitCheck.valid) {
      return res.status(400).json({ error: pageCheck.error || limitCheck.error });
    }

    if (limitCheck.value > 50) {
      return res.status(400).json({ error: 'Pagination limit cannot exceed 50 items per page.' });
    }

    const page = pageCheck.value;
    const limit = limitCheck.value;
    const skip = (page - 1) * limit;

    const { search, category, maxPrice, instantBook, condition, sortBy, excludeLender, startDate, endDate } = req.query;

    // Business rule: Exclude unavailable equipment listings
    const matchFilter = {
      isAvailable: true
    };

    if (category && category !== 'All Equipment' && category !== 'All' && category !== 'all') {
      matchFilter.category = category;
    }

    if (maxPrice !== undefined && maxPrice !== '') {
      const parsedMaxPrice = parseCoordinate(maxPrice);
      if (Number.isNaN(parsedMaxPrice) || parsedMaxPrice < 0) {
        return res.status(400).json({ error: 'Invalid maxPrice parameter.' });
      }
      matchFilter.pricePerDay = { $lte: parsedMaxPrice };
    }

    if (instantBook === 'true') {
      matchFilter.instantBook = true;
    }

    if (condition && condition !== 'all') {
      matchFilter.condition = new RegExp(escapeRegex(String(condition).trim()), 'i');
    }

    if (excludeLender) {
      if (!mongoose.Types.ObjectId.isValid(excludeLender)) {
        return res.status(400).json({ error: 'Invalid excludeLender ID format.' });
      }
      matchFilter.lender = { $ne: new mongoose.Types.ObjectId(excludeLender) };
    }

    // Optionally exclude items booked during requested dates
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        return res.status(400).json({ error: 'Invalid startDate or endDate filter.' });
      }
      const busyIds = await Booking.distinct('equipment', {
        status: { $in: ['approved', 'active'] },
        startDate: { $lte: end },
        endDate: { $gte: start }
      });
      if (busyIds.length > 0) {
        matchFilter._id = { $nin: busyIds };
      }
    }

    if (search && String(search).trim()) {
      const regex = new RegExp(escapeRegex(String(search).trim()), 'i');
      matchFilter.$or = [
        { title: regex },
        { description: regex },
        { category: regex },
        { tags: regex },
        { location: regex },
        { 'locationDetails.city': regex },
        { 'locationDetails.address': regex }
      ];
    }

    let sortStage = { distanceMeters: 1, createdAt: -1, _id: 1 };
    if (sortBy === 'price-low') {
      sortStage = { pricePerDay: 1, distanceMeters: 1, _id: 1 };
    } else if (sortBy === 'price-high') {
      sortStage = { pricePerDay: -1, distanceMeters: 1, _id: 1 };
    } else if (sortBy === 'rating') {
      sortStage = { rating: -1, distanceMeters: 1, _id: 1 };
    }

    // Ensure 2dsphere index is built before running $geoNear (safe no-op if already present)
    await Equipment.createIndexes();

    const pipeline = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [coordCheck.longitude, coordCheck.latitude]
          },
          key: 'locationDetails.coordinates',
          distanceField: 'distanceMeters',
          maxDistance: radiusKm * 1000,
          spherical: true,
          query: matchFilter
        }
      },
      {
        $addFields: {
          distanceKm: { $round: [{ $divide: ['$distanceMeters', 1000] }, 2] }
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { lenderId: '$lender' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$lenderId'] } } },
            {
              $project: {
                _id: 1,
                name: 1,
                avatar: 1,
                trustTier: 1,
                rating: 1,
                location: 1,
                responseTime: 1
              }
            },
            { $limit: 1 }
          ],
          as: 'lenderDocs'
        }
      },
      {
        $addFields: {
          lender: { $arrayElemAt: ['$lenderDocs', 0] }
        }
      },
      { $sort: sortStage },
      {
        $project: {
          lenderDocs: 0,
          distanceMeters: 0
        }
      },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          items: [{ $skip: skip }, { $limit: limit }]
        }
      }
    ];

    const [aggResult] = await Equipment.aggregate(pipeline);
    const total = aggResult?.metadata?.[0]?.total || 0;
    const rawItems = aggResult?.items || [];

    // Deduplicate safeguard by _id while preserving sort order
    const seenIds = new Set();
    const items = [];
    for (const item of rawItems) {
      const idStr = String(item._id);
      if (!seenIds.has(idStr)) {
        seenIds.add(idStr);
        items.push(item);
      }
    }

    const totalPages = Math.ceil(total / limit) || 1;
    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Page', page);
    res.setHeader('X-Total-Pages', totalPages);

    res.json({
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      center: {
        latitude: coordCheck.latitude,
        longitude: coordCheck.longitude
      },
      radiusKm
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to search nearby equipment', details: err.message });
  }
});

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

    const andConditions = [];

    if (location && location.trim() && location !== 'All Locations') {
      const locRegex = new RegExp(escapeRegex(location.trim()), 'i');
      andConditions.push({
        $or: [
          { location: locRegex },
          { 'locationDetails.address': locRegex },
          { 'locationDetails.city': locRegex },
          { 'locationDetails.state': locRegex },
          { 'locationDetails.postalCode': locRegex }
        ]
      });
    }

    if (search && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), 'i');
      andConditions.push({
        $or: [
          { title: regex },
          { description: regex },
          { category: regex },
          { tags: regex },
          { location: regex },
          { 'locationDetails.city': regex }
        ]
      });
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
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
      locationDetails,
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

    let resolvedLocationString = '';
    let resolvedLocationDetails;

    const rawStructuredLocation =
      locationDetails ?? (location && typeof location === 'object' ? location : undefined);

    if (rawStructuredLocation !== undefined) {
      const normalized = normalizeLocationInput(rawStructuredLocation, {
        requireCoordinates: Boolean(rawStructuredLocation.coordinates !== undefined || rawStructuredLocation.latitude !== undefined || rawStructuredLocation.longitude !== undefined)
      });
      if (!normalized.valid) {
        return res.status(400).json({ error: normalized.error });
      }
      resolvedLocationDetails = normalized.value;
      resolvedLocationString =
        (typeof location === 'string' && location.trim()) ||
        normalized.displayLabel ||
        normalized.value.address;
    } else if (typeof location === 'string' && location.trim()) {
      resolvedLocationString = location.trim();
    }

    if (!resolvedLocationString) {
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
      location: resolvedLocationString,
      ...(resolvedLocationDetails ? { locationDetails: resolvedLocationDetails } : {}),
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

    const updatePayload = { ...req.body };

    // Handle structured location / GeoJSON coordinates validation on update
    const rawStructuredLocation =
      updatePayload.locationDetails ??
      (updatePayload.location && typeof updatePayload.location === 'object'
        ? updatePayload.location
        : undefined);

    if (rawStructuredLocation !== undefined) {
      const normalized = normalizeLocationInput(rawStructuredLocation, {
        requireCoordinates: Boolean(
          rawStructuredLocation.coordinates !== undefined ||
          rawStructuredLocation.latitude !== undefined ||
          rawStructuredLocation.longitude !== undefined
        )
      });
      if (!normalized.valid) {
        return res.status(400).json({ error: normalized.error });
      }
      updatePayload.locationDetails = normalized.value;
      updatePayload.location =
        (typeof updatePayload.location === 'string' && updatePayload.location.trim()) ||
        normalized.displayLabel ||
        normalized.value.address;
    } else if (updatePayload.location !== undefined) {
      if (typeof updatePayload.location !== 'string' || !updatePayload.location.trim()) {
        return res.status(400).json({ error: 'Pickup location cannot be empty.' });
      }
      updatePayload.location = updatePayload.location.trim();
    }

    // Do not allow reassigning lender ownership
    delete updatePayload.lender;
    delete updatePayload._id;

    Object.assign(item, updatePayload);
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
