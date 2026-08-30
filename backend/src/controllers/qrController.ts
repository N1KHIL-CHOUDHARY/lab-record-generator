import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { createQRMapping, updateQRUrl, getQRAnalytics } from '../services/qrService.js';
import { normalizeGitHubUrl } from '../utils/githubValidator.js';
import { prisma } from '../config/prisma.js';

export const createQr = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rawUrl = (req.body.targetUrl || req.body.originalUrl || '').trim();
  const targetUrl = normalizeGitHubUrl(rawUrl) || rawUrl;

  const result = await createQRMapping(targetUrl, req.userId!, req.body.experimentId);

  res.status(201).json({
    success: true,
    data: {
      id: result.id,
      _id: result.id,
      shortId: result.shortId,
      shortCode: result.shortCode,
      targetUrl: result.targetUrl,
      destinationUrl: result.destinationUrl,
      redirectUrl: result.redirectUrl,
      qrDataUrl: result.qrDataUrl,
      qrImage: result.qrImage,
    },
  });
});

export const updateQrLink = asyncHandler(async (req: AuthRequest, res: Response) => {
  const shortId = String(req.params.shortId);
  const rawUrl = (req.body.targetUrl || req.body.originalUrl || '').trim();
  const targetUrl = normalizeGitHubUrl(rawUrl) || rawUrl;

  const updatedQr = await updateQRUrl(shortId, targetUrl, req.userId!);

  // Update experiment githubLink if linked
  await prisma.experiment.updateMany({
    where: {
      qr: { shortCode: shortId },
      userId: req.userId,
    },
    data: { githubLink: targetUrl },
  });

  res.status(200).json({
    success: true,
    message: 'QR link destination updated',
    data: {
      id: updatedQr.id,
      _id: updatedQr.id,
      shortId: updatedQr.shortCode,
      shortCode: updatedQr.shortCode,
      targetUrl: updatedQr.destinationUrl,
      destinationUrl: updatedQr.destinationUrl,
    },
  });
});

export const getAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const analytics = await getQRAnalytics(req.userId!);
  res.status(200).json({ success: true, data: analytics });
});
