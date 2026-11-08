import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import adminRoutes from './routes/adminRoutes.js';
import adminCalculatorRoutes from './routes/adminCalculatorRoutes.js';
import authRoutes from './routes/authRoutes.js';
import blogImageRoutes from './routes/blogImageRoutes.js';
import calculatorRoutes from './routes/calculatorRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { protect } from './middleware/auth.js';
import { requireAdmin } from './middleware/authorize.js';
import publicRoutes from './routes/publicRoutes.js';
import newsRoutes from './routes/newsRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import adminServiceRoutes from './routes/adminServiceRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS || '').split(','),
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:5173', 'http://127.0.0.1:5173']
    : [])
].map((origin) => origin?.trim().replace(/\/+$/, '')).filter(Boolean);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      const localDevelopmentOrigin = process.env.NODE_ENV !== 'production' &&
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '');
      if (!origin || allowedOrigins.includes(origin) || localDevelopmentOrigin) {
        return callback(null, true);
      }

      const error = new Error('Origin is not allowed by CORS.');
      error.status = 403;
      return callback(error);
    }
  })
);
app.use(helmet());
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use('/api/user/blog-images', blogImageRoutes);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  const databaseStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];

  res.json({
    ok: true,
    service: 'finance-tax-community-server',
    status: 'running',
    database: databaseStates[mongoose.connection.readyState] || 'unknown'
  });
});

app.use('/api', publicRoutes);
app.use('/api/v1/calculators', calculatorRoutes);
app.use('/api/v1/admin/calculators', protect, requireAdmin, adminCalculatorRoutes);
app.use('/api/v1/news', newsRoutes);
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/admin/services', protect, requireAdmin, adminServiceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', protect, userRoutes);
app.use('/api/admin', protect, requireAdmin, adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

app.use(errorHandler);

export default app;
