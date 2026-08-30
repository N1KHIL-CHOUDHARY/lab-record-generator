import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: env.nodeEnv === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

if (env.nodeEnv !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export async function connectPrisma(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL (Supabase) via Prisma');
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    throw error;
  }
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
