import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { updateQRUrl, getQRAnalytics } from '../services/qrService.js';
import { normalizeGitHubUrl } from '../utils/githubValidator.js';
import { Experiment } from '../models/Experiment.js';

export const updateQrLink = asyncHandler(async (req: AuthRequest, res: Response) => {
  const shortId = String(req.params.shortId);
  const url = normalizeGitHubUrl(req.body.originalUrl);

  await updateQRUrl(shortId, url, req.userId!);

  await Experiment.updateOne(
    { qrShortId: shortId, userId: req.userId },
    { githubLink: url }
  );

  res.status(200).json({ success: true, message: 'QR link updated' });
});

export const getAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const analytics = await getQRAnalytics(req.userId!);
  res.status(200).json({ success: true, data: analytics });
});
