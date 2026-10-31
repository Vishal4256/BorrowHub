import rateLimit from 'express-rate-limit';

// Strict rate limiter for authentication routes (login / register) to prevent brute-force attacks
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 50, // 50 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.'
  }
});

// General API rate limiter for standard traffic
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 5000 : 300, // 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP address. Please try again later.'
  }
});

