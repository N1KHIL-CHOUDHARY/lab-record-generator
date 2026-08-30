import QRCode from 'qrcode';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { defaultShortCodeGenerator } from './shortCode/index.js';
import { getStorageService } from './storage/index.js';
import { AppError } from '../utils/AppError.js';

export interface QRMappingResult {
  id: string;
  _id: string; // for frontend backward compatibility
  shortId: string;
  shortCode: string;
  targetUrl: string;
  destinationUrl: string;
  qrImage: string;
  qrDataUrl: string;
  redirectUrl: string;
}

export async function createQRMapping(
  destinationUrl: string,
  userId: string,
  _experimentId?: string
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

  const qr: any = await prisma.qR.create({
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

  return {
    ...updatedQr,
    _id: updatedQr.id,
    targetUrl: updatedQr.destinationUrl,
    shortId: updatedQr.shortCode,
  };
}

export async function handleRedirect(shortCode: string): Promise<string> {
  const qr: any = await prisma.qR.findUnique({
    where: { shortCode },
  });

  if (!qr) {
    throw new AppError('Link not found', 404);
  }

  if (qr.status !== 'ACTIVE') {
    throw new AppError('This QR code link has been disabled or revoked', 410);
  }

  // Non-blocking scan counter update
  prisma.qR
    .update({
      where: { shortCode },
      data: {
        totalScans: { increment: 1 },
        lastScannedAt: new Date(),
      },
    })
    .catch((err: unknown) => console.error('Failed to increment QR scans:', err));

  return qr.destinationUrl;
}

export async function getQRAnalytics(userId: string) {
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
