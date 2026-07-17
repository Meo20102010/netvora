import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import prisma from './config/database';

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
import { adminExtendedRoutes } from './routes/adminExtended';
import socialRoutes from './routes/social';
import aiRoutes from './routes/ai';
import securityRoutes from './routes/security';
import subscriptionExtendedRoutes from './routes/subscription-extended';
import adminStatsRoutes from './routes/admin-stats';
import { ibanPaymentRoutes } from './routes/ibanPayment';

const app = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
app.use('/api/', generalLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Netvora API is running', mode: 'serverless', timestamp: new Date().toISOString() });
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
app.use('/api/social', socialRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/subscription', subscriptionExtendedRoutes);
app.use('/api/admin/stats', adminStatsRoutes);
app.use('/api/payment/iban', ibanPaymentRoutes(prisma));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
