import express from 'express';
import User from '../models/User.js';
import { generateToken, protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { isValidImageUrl } from '../utils/urlValidator.js';

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register - Rate-limited, validated user registration
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, role, location, bio, avatar } = req.body;

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

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: assignedRole,
      avatar: avatar ? avatar.trim() : '',
      location: location ? location.trim() : '',
      bio: bio ? bio.trim() : 'BorrowHub community member.'
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        trustTier: user.trustTier,
        rating: user.rating,
        location: user.location,
        bio: user.bio
      },
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
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        trustTier: user.trustTier,
        rating: user.rating,
        location: user.location,
        bio: user.bio
      },
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

// GET /api/auth/users - Registered peers directory for authenticated messaging
router.get('/users', protect, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users', details: err.message });
  }
});

export default router;
