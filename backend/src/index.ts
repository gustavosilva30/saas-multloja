import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import { config } from './config';
import { initializeBucket, minioClient, BUCKET_NAME } from './config/minio';
import { pool as dbPool } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import customerRoutes from './routes/customers';
import saleRoutes from './routes/sales';
import uploadRoutes from './routes/upload';
import adminRoutes from './routes/admin';
import moduleRoutes from './routes/modules';

const app = express();

// Security middleware
app.use(helmet());

// CORS
const allowedOrigins = config.CORS_ORIGIN === '*'
  ? '*'
  : config.CORS_ORIGIN.split(',').map(o => o.trim());

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins === '*') return callback(null, true);
    if ((allowedOrigins as string[]).includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW,
  max: config.RATE_LIMIT_MAX,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.NODE_ENV !== 'test') {
  app.use(morgan(config.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// Health check — v2
app.get('/health', async (req, res) => {
  const checks: Record<string, 'ok' | 'error'> = {};

  try {
    await dbPool.query('SELECT 1');
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  try {
    await minioClient.bucketExists(BUCKET_NAME);
    checks.storage = 'ok';
  } catch {
    checks.storage = 'error';
  }

  const healthy = Object.values(checks).every((v) => v === 'ok');
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    checks,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/modules', moduleRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.PORT;

async function startServer() {
  // Start server first — MinIO is optional for core API routes
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${config.NODE_ENV}`);
    console.log(`🔒 CORS Origin: ${config.CORS_ORIGIN}`);
  });

  // Initialize MinIO in background — failure won't crash the server
  initializeBucket()
    .then(() => console.log('✅ MinIO bucket initialized'))
    .catch((err) => console.warn('⚠️  MinIO unavailable (uploads disabled):', err.message));
}

startServer();

export default app;
