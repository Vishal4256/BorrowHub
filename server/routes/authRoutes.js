import express from 'express';
import User from '../models/User.js';
import { generateToken, protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { isValidImageUrl } from '../utils/urlValidator.js';
import { normalizeLocationInput } from '../utils/locationValidator.js';

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  trustTier: user.trustTier,
  rating: user.rating,
  location: user.location,
  preferredLocation: user.preferredLocation,
  bio: user.bio
});

// POST /api/auth/register - Rate-limited, validated user registration
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, role, location, preferredLocation, bio, avatar } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'A valid full name is required.' });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (avatar && !isValidImageUrl(avatar)) {
      return res.status(400).json({ error: 'Invalid avatar image URL or protocol.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email address already exists.' });
    }

    // Role assignment security:
    // Admin role cannot be self-assigned via public signup without secret key
    let assignedRole = 'borrower';
    if (role === 'lender') {
      assignedRole = 'lender';
    } else if (role === 'admin') {
      const adminKey = req.headers['x-admin-key'] || req.body.adminSecretKey;
      if (process.env.ADMIN_SECRET_KEY && adminKey === process.env.ADMIN_SECRET_KEY) {
        assignedRole = 'admin';
      } else {
        return res.status(403).json({
          error: 'Unauthorized: Admin role cannot be self-assigned via public registration.'
        });
      }
    }

    let normalizedPreferredLocation;
    let resolvedLocationStr = typeof location === 'string' ? location.trim() : '';

    const rawLocObj = preferredLocation ?? (location && typeof location === 'object' ? location : undefined);
    if (rawLocObj !== undefined) {
      const normalized = normalizeLocationInput(rawLocObj, { requireCoordinates: true });
      if (!normalized.valid) {
        return res.status(400).json({ error: normalized.error });
      }
      normalizedPreferredLocation = normalized.value;
      if (!resolvedLocationStr) {
        resolvedLocationStr = normalized.displayLabel || normalized.value.address;
      }
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: assignedRole,
      avatar: avatar ? avatar.trim() : '',
      location: resolvedLocationStr,
      ...(normalizedPreferredLocation ? { preferredLocation: normalizedPreferredLocation } : {}),
      bio: bio ? bio.trim() : 'BorrowHub community member.'
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      user: sanitizeUser(user),
      token
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

// POST /api/auth/login - Rate-limited, secure authentication
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      user: sanitizeUser(user),
      token
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// GET /api/auth/me - Protected session verification
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// PUT / PATCH /api/auth/location - Update authenticated user's preferred location
const handleUpdateUserLocation = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (req.body?.clear === true || req.body?.preferredLocation === null) {
      user.preferredLocation = undefined;
      user.location = '';
      await user.save();
      return res.json({
        success: true,
        user: sanitizeUser(user)
      });
    }

    const rawLoc = req.body?.preferredLocation ?? req.body?.location ?? req.body;
    const normalized = normalizeLocationInput(rawLoc, { requireCoordinates: true });
    if (!normalized.valid) {
      return res.status(400).json({ error: normalized.error });
    }

    user.preferredLocation = normalized.value;
    user.location = normalized.displayLabel || normalized.value.address;
    await user.save();

    res.json({
      success: true,
      user: sanitizeUser(user)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update preferred location', details: err.message });
  }
};

router.put('/location', protect, handleUpdateUserLocation);
router.patch('/location', protect, handleUpdateUserLocation);

// GET /api/auth/users - Registered peers directory for authenticated messaging
// Privacy: Never expose password hashes or precise user coordinates to peers
router.get('/users', protect, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('-password -preferredLocation')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users', details: err.message });
  }
});

export default router;
