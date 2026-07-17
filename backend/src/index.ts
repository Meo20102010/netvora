import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import contentRoutes from './routes/content';
import adminRoutes from './routes/admin';
import userRoutes from './routes/user';
import subscriptionRoutes from './routes/subscription';
import paymentRoutes from './routes/payment';
import notificationRoutes from './routes/notification';
import searchRoutes from './routes/search';
import proxyRoutes from './routes/proxy';
import importRoutes from './routes/import';
import { adminExtendedRoutes } from './routes/adminExtended';
import socialRoutes from './routes/social';
import aiRoutes from './routes/ai';
import securityRoutes from './routes/security';
import subscriptionExtendedRoutes from './routes/subscription-extended';
import adminStatsRoutes from './routes/admin-stats';
import { ibanPaymentRoutes } from './routes/ibanPayment';

const app = express();
const prisma = new PrismaClient();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (config.site.url || '').split(',').map(s => s.trim());
    if (!origin || allowed.includes(origin) || allowed.some(o => origin.startsWith(o.replace('localhost', 'localhost')))) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting
app.use('/api/', generalLimiter);

// Storage directories
const STORAGE_ROOT = path.join(__dirname, '../storage');
const VIDEOS_DIR = path.join(STORAGE_ROOT, 'videos');
const IMAGES_DIR = path.join(STORAGE_ROOT, 'images');
for (const dir of [STORAGE_ROOT, VIDEOS_DIR, IMAGES_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Static media serving
app.use('/media/videos', express.static(VIDEOS_DIR, { maxAge: '1y', immutable: true }));
app.use('/media/images', express.static(IMAGES_DIR, { maxAge: '30d' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Netvora API is running', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminExtendedRoutes(prisma));
app.use('/api/user', userRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/import', importRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/subscription', subscriptionExtendedRoutes);
app.use('/api/admin/stats', adminStatsRoutes);
app.use('/api/payment/iban', ibanPaymentRoutes(prisma));

// Receipts static serving
app.use('/storage/receipts', express.static(path.join(__dirname, '../storage/receipts')));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
    console.log(`\x1b[36m  NETVORA API v1.0.0                     \x1b[0m`);
    console.log(`\x1b[36m  Port: ${config.port}                        \x1b[0m`);
    console.log(`\x1b[36m  Mode: ${config.nodeEnv}                      \x1b[0m`);
    console.log(`\x1b[36m  URL:  http://localhost:${config.port}/api    \x1b[0m`);
    console.log(`\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
  });
}

export default app;
