import express from 'express';
import { geocodeLimiter } from '../middleware/rateLimiter.js';
import { searchLocations, reverseGeocode } from '../services/geocodingService.js';

const router = express.Router();

// GET /api/location/search?q=Phagwara&limit=5
router.get('/search', geocodeLimiter, async (req, res) => {
  try {
    const { q, limit } = req.query;
    const results = await searchLocations(q, { limit });
    res.json({
      success: true,
      results
    });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({
      error: err.message || 'Location search failed.'
    });
  }
});

// GET /api/location/reverse?lat=31.2240&lng=75.7708
router.get('/reverse', geocodeLimiter, async (req, res) => {
  try {
    const lat = req.query.lat ?? req.query.latitude;
    const lng = req.query.lng ?? req.query.longitude;

    if (lat === undefined || lng === undefined || lat === '' || lng === '') {
      return res.status(400).json({
        error: 'Both lat and lng query parameters are required.'
      });
    }

    const location = await reverseGeocode(lat, lng);
    res.json({
      success: true,
      location
    });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({
      error: err.message || 'Reverse geocoding failed.'
    });
  }
});

export default router;
