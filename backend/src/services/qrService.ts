import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs/promises';
import { env } from '../config/env.js';
import { QR, type IQR } from '../models/QR.js';
import { generateShortId } from '../utils/shortId.js';
import { AppError } from '../utils/AppError.js';
import { Types } from 'mongoose';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'qr');

async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export interface QRMappingResult {
  shortId: string;
  targetUrl: string;
  qrImage: string;
  qrDataUrl: string;
  redirectUrl: string;
}

export async function createQRMapping(
  targetUrl: string,
  createdBy: Types.ObjectId | string,
  experimentId?: Types.ObjectId | string
): Promise<QRMappingResult> {
  await ensureUploadDir();

  let shortId = generateShortId();
  let exists = await QR.findOne({ shortId });

  while (exists) {
    shortId = generateShortId();
    exists = await QR.findOne({ shortId });
  }

  const redirectUrl = `${env.appUrl}/r/${shortId}`;

  // Generate QR as Data URL for direct embed in React PDF / Frontend
  const qrDataUrl = await QRCode.toDataURL(redirectUrl, {
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  // Save to file as static asset fallback
  const qrImageFileName = `${shortId}.png`;
  const qrImagePath = path.join(UPLOADS_DIR, qrImageFileName);

  await QRCode.toFile(qrImagePath, redirectUrl, {
    type: 'png',
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  const userObjectId = typeof createdBy === 'string' ? new Types.ObjectId(createdBy) : createdBy;
  const expObjectId = experimentId
    ? typeof experimentId === 'string'
      ? new Types.ObjectId(experimentId)
      : experimentId
    : undefined;

  await QR.create({
    shortId,
    targetUrl,
    createdBy: userObjectId,
    experimentId: expObjectId,
    totalScans: 0,
  });

  const qrImage = `/uploads/qr/${qrImageFileName}`;

  return { shortId, targetUrl, qrImage, qrDataUrl, redirectUrl };
}

export async function updateQRUrl(
  shortId: string,
  newTargetUrl: string,
  userId: string
): Promise<IQR> {
  const qr = await QR.findOne({ shortId });

  if (!qr) {
    throw new AppError('QR code not found', 404);
  }

  const ownerId = qr.createdBy ? qr.createdBy.toString() : qr.userId?.toString();
  if (ownerId !== userId) {
    throw new AppError('Not authorized to update this QR', 403);
  }

  qr.targetUrl = newTargetUrl;
  await qr.save();

  return qr;
}

export async function handleRedirect(shortId: string): Promise<string> {
  const qr = await QR.findOne({ shortId });

  if (!qr) {
    throw new AppError('Link not found', 404);
  }

  qr.totalScans = (qr.totalScans || 0) + 1;
  qr.lastScannedAt = new Date();
  await qr.save();

  return qr.targetUrl || (qr as any).originalUrl;
}

export async function getQRAnalytics(userId: string) {
  const userObjectId = new Types.ObjectId(userId);
  const qrs = await QR.find({
    $or: [{ createdBy: userObjectId }, { userId: userObjectId }],
  })
    .sort({ totalScans: -1 })
    .limit(20);

  const totalScans = qrs.reduce((sum, q) => sum + (q.totalScans || 0), 0);

  return {
    totalScans,
    topLinks: qrs.map((q) => ({
      shortId: q.shortId,
      targetUrl: q.targetUrl || q.originalUrl,
      originalUrl: q.targetUrl || q.originalUrl,
      totalScans: q.totalScans || 0,
      lastScannedAt: q.lastScannedAt,
    })),
  };
}
