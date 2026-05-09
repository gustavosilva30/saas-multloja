import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000'),
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'sua_chave_secreta_aqui_minimo_32_caracteres',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://nexus:nexus_password_2024@localhost:5432/nexus_erp',
  
  // MinIO
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || 'localhost',
  MINIO_PORT: parseInt(process.env.MINIO_PORT || '9000'),
  MINIO_USE_SSL: process.env.MINIO_USE_SSL === 'true',
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || 'nexus',
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || 'minio_password_2024',
  MINIO_BUCKET: process.env.MINIO_BUCKET || 'nexus-uploads',
  
  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 min
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  
  // Upload
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
};

export default config;
