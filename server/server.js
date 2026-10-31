import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import { apiLimiter } from './middleware/rateLimiter.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy when deployed behind reverse proxy (Render, Heroku, Nginx)
app.set('trust proxy', 1);

// Security Headers via Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows client apps to load uploaded images
    contentSecurityPolicy: false // API does not render HTML
  })
);

// CORS configuration supporting local development and deployed frontend (e.g. Vercel)
const configuredOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((u) => u.trim().replace(/\/$/, ''))
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5000'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile, curl, server-to-server)
    if (!origin) return callback(null, true);

    // In test or non-production mode, allow all origins
    if (process.env.NODE_ENV !== 'production' || configuredOrigins.includes('*')) {
      return callback(null, true);
    }

    // Match configured origins or any vercel.app preview domain
    const isAllowed =
      configuredOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      configuredOrigins.some((allowed) => {
        if (allowed.includes('*')) {
          const regex = new RegExp('^' + allowed.replace(/\*/g, '.*') + '$');
          return regex.test(origin);
        }
        return false;
      });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked request from origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key']
};

// Handle Chrome Private Network Access preflight
app.use((req, res, next) => {
  if (req.headers['access-control-request-private-network']) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  next();
});

app.use(cors(corsOptions));

// Body parsing with safe payload limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Static file serving for uploaded equipment images
const uploadsDir = path.join(__dirname, 'uploads');
app.use(
  '/uploads',
  express.static(uploadsDir, {
    maxAge: '1d',
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  })
);

// General API rate limiter for standard routes
app.use('/api/', apiLimiter);

// Health Check Endpoint (For Render, uptime monitors, and Kubernetes)
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const status = isDbConnected ? 'ok' : 'degraded';
  res.status(isDbConnected ? 200 : 503).json({
    status,
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: isDbConnected ? 'connected' : 'disconnected',
      readyState: mongoose.connection.readyState
    },
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/upload', uploadRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralized Error Handling Middleware (Prevents leaking stack traces in production)
app.use((err, req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  if (err.message && err.message.includes('CORS blocked')) {
    return res.status(403).json({ error: err.message });
  }

  const clientMessage =
    isProd && statusCode === 500
      ? 'An internal server error occurred. Please try again later.'
      : err.message || 'An unexpected error occurred.';

  console.error(`[BorrowHub Error] ${req.method} ${req.originalUrl} (${statusCode}):`, err.message);

  res.status(statusCode).json({
    error: clientMessage,
    ...(isProd ? {} : { stack: err.stack })
  });
});

// Database connection with production pool and timeout configuration
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/borrowhub';

const isTest = process.env.NODE_ENV === 'test' || process.argv.some((arg) => arg.includes('test'));

const mongooseOptions = {
  dbName: process.env.MONGO_DB_NAME || (isTest ? 'borrowhub_test' : 'borrowhub'),
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4 // Use IPv4 (avoids DNS delays on cloud platforms like Render)
};

mongoose
  .connect(MONGO_URI, mongooseOptions)
  .then(() => {
    console.log('Connected to MongoDB database:', MONGO_URI.replace(/:([^:@]+)@/, ':****@'));
  })
  .catch((err) => {
    console.error('CRITICAL: MongoDB connection error:', err.message);
  });

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB connection lost. Reconnecting...');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB driver error event:', err.message);
});

let serverInstance = null;

if (!isTest) {
  serverInstance = app.listen(PORT, () => {
    console.log(`BorrowHub Server listening on http://localhost:${PORT}`);
  });
}

// Graceful Shutdown Handler (Handles SIGTERM from Render/Kubernetes and SIGINT from terminal)
const handleGracefulShutdown = async (signal) => {
  console.log(`\n[${signal}] Initiating graceful shutdown of BorrowHub backend...`);
  try {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
      console.log('HTTP connection listener closed.');
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('MongoDB connection closed cleanly.');
    }
    console.log('BorrowHub graceful shutdown complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

export default app;
