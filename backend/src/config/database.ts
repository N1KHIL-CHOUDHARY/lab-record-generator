import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase(): Promise<void> {
  if (!env.mongodbUri) {
    console.warn('MONGODB_URI not set — skipping database connection');
    return;
  }

  await mongoose.connect(env.mongodbUri);
  console.log('MongoDB connected');
}
