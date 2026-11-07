import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import telemetryRoutes from './routes/telemetryRoutes.js';
import workOrderRoutes from './routes/workOrderRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import userRoutes from './routes/userRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import { globalErrorHandler, notFoundHandler } from './middleware/errorMiddleware.js';

const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false // Allows API consumption from SPA client
  })
);

// CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow during local dev
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key']
  })
);

// Request Parsing & Cookies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global General Rate Limiter (200 requests per 15 minutes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});
app.use('/api/', globalLimiter);

// Base API Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/assets', assetRoutes);
app.use('/api/v1/telemetry', telemetryRoutes);
app.use('/api/v1/work-orders', workOrderRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'AI-Powered Smart Asset Reliability & Maintenance Suite API',
    industry: 'Dairy Cooperative Supply Chain',
    version: '1.0.0',
    documentation: '/api/v1/health'
  });
});

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;

