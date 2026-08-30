import QRCode from 'qrcode';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { defaultShortCodeGenerator } from './shortCode/index.js';
import { getStorageService } from './storage/index.js';
import { AppError } from '../utils/AppError.js';
import {
  cacheRedirectUrl,
  getCachedRedirectUrl,
  invalidateRedirectCache,
  bufferScanIncrement,
  fetchAndClearScanBatch,
} from '../config/redis.js';

export interface QRMappingResult {
  id: string;
  _id: string; // for frontend backward compatibility
  shortId: string;
  shortCode: string;
  targetUrl: string;
  destinationUrl: string;
  qrImage: string;
  qrImageFileName: string;
  qrDataUrl: string;
  redirectUrl: string;
}

/**
 * Creates a dynamic QR mapping record.
 * Supports participating in an ambient Prisma transaction if `tx` is provided.
 */
export async function createQRMapping(
  destinationUrl: string,
  userId: string,
  _experimentId?: string,
  tx?: any
): Promise<QRMappingResult> {
  const storageService = getStorageService();

  // Generate atomic collision-free short code
  const shortCode = await defaultShortCodeGenerator.generate();
  const redirectUrl = `${env.appUrl}/r/${shortCode}`;

  // Generate QR as Data URL for direct embed in React PDF / Frontend
  const qrDataUrl = await QRCode.toDataURL(redirectUrl, {
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  // Generate PNG buffer
  const qrBuffer = await QRCode.toBuffer(redirectUrl, {
    type: 'png',
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  // Upload to storage (S3 / R2 / Local)
  const qrImageFileName = `qr/${shortCode}.png`;
  const qrImageUrl = await storageService.upload(qrImageFileName, qrBuffer, 'image/png');

  const db = tx || prisma;
  const qr: any = await db.qR.create({
    data: {
      shortCode,
      destinationUrl,
      userId,
      totalScans: 0,
    },
  });

  return {
    id: qr.id,
    _id: qr.id,
    shortId: qr.shortCode,
    shortCode: qr.shortCode,
    targetUrl: qr.destinationUrl,
    destinationUrl: qr.destinationUrl,
    qrImage: qrImageUrl,
    qrImageFileName,
    qrDataUrl,
    redirectUrl,
  };
}

export async function updateQRUrl(
  shortCode: string,
  newDestinationUrl: string,
  userId: string
) {
  const qr: any = await prisma.qR.findUnique({
    where: { shortCode },
  });

  if (!qr) {
    throw new AppError('QR code not found', 404);
  }

  if (qr.userId !== userId) {
    throw new AppError('Not authorized to update this QR', 403);
  }

  const updatedQr: any = await prisma.qR.update({
    where: { shortCode },
    data: { destinationUrl: newDestinationUrl },
  });

  // Invalidate cached redirect URL in Redis
  await invalidateRedirectCache(shortCode).catch(() => {});

  return {
    ...updatedQr,
    _id: updatedQr.id,
    targetUrl: updatedQr.destinationUrl,
    shortId: updatedQr.shortCode,
  };
}

/**
 * Resolves short link redirect with Redis caching & buffered scan counting
 */
export async function handleRedirect(shortCode: string): Promise<string> {
  // 1. Check Redis redirect cache
  const cachedUrl = await getCachedRedirectUrl(shortCode);
  if (cachedUrl) {
    // Asynchronously buffer scan increment to Redis
    bufferScanIncrement(shortCode).catch((err) =>
      console.error('Failed to buffer scan count:', err)
    );
    return cachedUrl;
  }

  // 2. Cache miss: Query PostgreSQL via Prisma
  const qr: any = await prisma.qR.findUnique({
    where: { shortCode },
  });

  if (!qr) {
    throw new AppError('Link not found', 404);
  }

  if (qr.status !== 'ACTIVE') {
    throw new AppError('This QR code link has been disabled or revoked', 410);
  }

  // 3. Cache the destination URL in Redis (TTL: 1 hour)
  await cacheRedirectUrl(shortCode, qr.destinationUrl, 3600).catch(() => {});

  // 4. Buffer scan increment
  bufferScanIncrement(shortCode).catch((err) =>
    console.error('Failed to buffer scan count:', err)
  );

  return qr.destinationUrl;
}

/**
 * Flushes all buffered scan counts from Redis hash to PostgreSQL in a single batch
 */
export async function flushScanCounts(): Promise<number> {
  try {
    const batch = await fetchAndClearScanBatch();
    const entries = Object.entries(batch);
    if (entries.length === 0) return 0;

    const now = new Date();
    await prisma.$transaction(
      entries.map(([shortCode, incrementBy]) =>
        prisma.qR.update({
          where: { shortCode },
          data: {
            totalScans: { increment: incrementBy },
            lastScannedAt: now,
          },
        })
      )
    );

    return entries.length;
  } catch (err) {
    console.error('Error flushing scan counts to PostgreSQL:', err);
    return 0;
  }
}

let flushIntervalTimer: NodeJS.Timeout | null = null;

/**
 * Starts the periodic background flush interval (runs every 30 seconds)
 */
export function startScanFlushInterval(intervalMs = 30000): void {
  if (flushIntervalTimer) return;

  flushIntervalTimer = setInterval(async () => {
    await flushScanCounts();
  }, intervalMs);

  // Allow process to exit cleanly if timer is only active ref
  if (flushIntervalTimer.unref) {
    flushIntervalTimer.unref();
  }
}

/**
 * Stops the flush interval and performs a final synchronous flush
 */
export async function stopScanFlushInterval(): Promise<void> {
  if (flushIntervalTimer) {
    clearInterval(flushIntervalTimer);
    flushIntervalTimer = null;
  }
  await flushScanCounts();
}

export async function getQRAnalytics(userId: string) {
  // Ensure recent buffered scans are flushed before retrieving analytics
  await flushScanCounts().catch(() => {});

  const qrs: any[] = await prisma.qR.findMany({
    where: { userId },
    orderBy: { totalScans: 'desc' },
    take: 20,
  });

  const totalScans = qrs.reduce((sum: number, q: any) => sum + (Number(q.totalScans) || 0), 0);

  return {
    totalScans,
    topLinks: qrs.map((q: any) => ({
      id: q.id,
      _id: q.id,
      shortId: q.shortCode,
      shortCode: q.shortCode,
      targetUrl: q.destinationUrl,
      originalUrl: q.destinationUrl,
      totalScans: q.totalScans || 0,
      lastScannedAt: q.lastScannedAt,
    })),
  };
}
