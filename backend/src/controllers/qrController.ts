import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { createQRMapping, updateQRUrl, getQRAnalytics } from '../services/qrService.js';
import { normalizeGitHubUrl } from '../utils/githubValidator.js';
import { Experiment } from '../models/Experiment.js';

export const createQr = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rawUrl = (req.body.targetUrl || req.body.originalUrl || '').trim();
  const targetUrl = normalizeGitHubUrl(rawUrl) || rawUrl;

  const result = await createQRMapping(targetUrl, req.userId!, req.body.experimentId);

  res.status(201).json({
    success: true,
    data: {
      shortId: result.shortId,
      targetUrl: result.targetUrl,
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

  await Experiment.updateOne(
    { qrShortId: shortId, userId: req.userId },
    { githubLink: targetUrl }
  );

  res.status(200).json({
    success: true,
    message: 'QR link updated',
    data: {
      shortId: updatedQr.shortId,
      targetUrl: updatedQr.targetUrl,
    },
  });
});

export const getAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const analytics = await getQRAnalytics(req.userId!);
  res.status(200).json({ success: true, data: analytics });
});
