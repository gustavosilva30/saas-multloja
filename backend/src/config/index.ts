import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const config = {
  NODE_ENV: optional('NODE_ENV', 'production'),
  PORT: parseInt(optional('PORT', '3000')),

  JWT_SECRET: required('JWT_SECRET'),
  ADMIN_JWT_SECRET: optional('ADMIN_JWT_SECRET', process.env.JWT_SECRET || 'NexusPlatformAdminDefaultSecret'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '7d'),

  // Database — obrigatório, sem fallback
  DATABASE_URL: required('DATABASE_URL'),

  // MinIO
  MINIO_ENDPOINT: optional('MINIO_ENDPOINT', 'localhost'),
  MINIO_PORT: parseInt(optional('MINIO_PORT', '9000')),
  MINIO_USE_SSL: process.env.MINIO_USE_SSL === 'true',
  MINIO_ACCESS_KEY: optional('MINIO_ACCESS_KEY', 'minioadmin'),
  MINIO_SECRET_KEY: optional('MINIO_SECRET_KEY', ''),
  MINIO_BUCKET: optional('MINIO_BUCKET', 'nexus-uploads'),

  // CORS
  CORS_ORIGIN: optional('CORS_ORIGIN', 'https://gsntech.com.br,https://www.gsntech.com.br'),

  // Rate Limiting
  RATE_LIMIT_WINDOW: parseInt(optional('RATE_LIMIT_WINDOW', '900000')),
  RATE_LIMIT_MAX: parseInt(optional('RATE_LIMIT_MAX', '100')),

  // Upload
  MAX_FILE_SIZE: parseInt(optional('MAX_FILE_SIZE', '10485760')),
  UPLOAD_PATH: optional('UPLOAD_PATH', './uploads'),

  // Asaas — gateway de pagamento
  ASAAS_API_KEY: optional('ASAAS_API_KEY', ''),
  ASAAS_API_URL: optional('ASAAS_API_URL', 'https://sandbox.asaas.com'),
  ASAAS_WEBHOOK_TOKEN: optional('ASAAS_WEBHOOK_TOKEN', ''),

  // Evolution API — WhatsApp
  EVOLUTION_API_URL: optional('EVOLUTION_API_URL', 'https://crm-loja-evolution-api.ini6ln.easypanel.host'),
  EVOLUTION_API_KEY: optional('EVOLUTION_API_KEY', ''),

  // URL pública do frontend — usada para gerar links de aprovação de OS
  APP_PUBLIC_URL: optional('APP_PUBLIC_URL', 'https://douradosap.com.br'),

  // Mercado Livre
  ML_CLIENT_ID: optional('ML_CLIENT_ID', '1175427003647678'),
  ML_CLIENT_SECRET: optional('ML_CLIENT_SECRET', 'Pvq3D97LD9Ew2dWa0Rezp9N5jTX4sikK'),
  ML_REDIRECT_URI: optional('ML_REDIRECT_URI', 'https://api.douradosap.com.br/ml/callback'),
};

export default config;
