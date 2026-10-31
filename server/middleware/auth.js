import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing.');
    }
    return 'borrowhub_jwt_super_secret_key_2026';
  }
  return secret;
};

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, getJwtSecret(), { expiresIn: '7d' });
};

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized: No authentication token provided' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'Not authorized: User account not found for provided token' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired: Your login token has expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Not authorized: Invalid authentication token' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: Administrative privileges required' });
  }
};
