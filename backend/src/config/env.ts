import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:5000',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  directUrl: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
  storage: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'auto',
    bucket: process.env.S3_BUCKET || '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    publicUrl: process.env.S3_PUBLIC_URL,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
  isProduction: process.env.NODE_ENV === 'production',
};

export function validateProductionEnv(): void {
  if (env.isProduction) {
    requireEnv('DATABASE_URL');
    requireEnv('JWT_SECRET');
    requireEnv('FIREBASE_PROJECT_ID');
    requireEnv('FIREBASE_CLIENT_EMAIL');
    requireEnv('FIREBASE_PRIVATE_KEY');
  }
}
