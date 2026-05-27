import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs/promises';
import { env } from '../config/env.js';
import { QR } from '../models/QR.js';
import { generateShortId } from '../utils/shortId.js';
import { AppError } from '../utils/AppError.js';
import { Types } from 'mongoose';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'qr');

async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export async function createQRMapping(
  originalUrl: string,
  userId: Types.ObjectId,
  experimentId?: Types.ObjectId
): Promise<{ shortId: string; qrImage: string; redirectUrl: string }> {
  await ensureUploadDir();

  let shortId = generateShortId();
  let exists = await QR.findOne({ shortId });

  while (exists) {
    shortId = generateShortId();
    exists = await QR.findOne({ shortId });
  }

  const redirectUrl = `${env.appUrl}/r/${shortId}`;

  const qrImageFileName = `${shortId}.png`;
  const qrImagePath = path.join(UPLOADS_DIR, qrImageFileName);

  await QRCode.toFile(qrImagePath, redirectUrl, {
    type: 'png',
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  await QR.create({
    shortId,
    originalUrl,
    userId,
    experimentId,
    totalScans: 0,
  });

  const qrImage = `/uploads/qr/${qrImageFileName}`;

  return { shortId, qrImage, redirectUrl };
}

export async function updateQRUrl(shortId: string, newUrl: string, userId: string): Promise<void> {
  const qr = await QR.findOne({ shortId });

  if (!qr) {
    throw new AppError('QR code not found', 404);
  }

  if (qr.userId.toString() !== userId) {
    throw new AppError('Not authorized to update this QR', 403);
  }

  qr.originalUrl = newUrl;
  await qr.save();
}

export async function handleRedirect(shortId: string): Promise<string> {
  const qr = await QR.findOne({ shortId });

  if (!qr) {
    throw new AppError('Link not found', 404);
  }

  qr.totalScans += 1;
  qr.lastScannedAt = new Date();
  await qr.save();

  return qr.originalUrl;
}

export async function getQRAnalytics(userId: string) {
  const qrs = await QR.find({ userId }).sort({ totalScans: -1 }).limit(20);

  const totalScans = qrs.reduce((sum, q) => sum + q.totalScans, 0);

  return {
    totalScans,
    topLinks: qrs.map((q) => ({
      shortId: q.shortId,
      originalUrl: q.originalUrl,
      totalScans: q.totalScans,
      lastScannedAt: q.lastScannedAt,
    })),
  };
}
