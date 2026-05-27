import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { handleRedirect } from '../services/qrService.js';
import { AppError } from '../utils/AppError.js';

export const redirectShortLink = asyncHandler(async (req: Request, res: Response) => {
  const shortId = String(req.params.shortId);

  if (!shortId || shortId.length < 4) {
    throw new AppError('Invalid link', 400);
  }

  try {
    const url = await handleRedirect(shortId);
    res.redirect(302, url);
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 404) {
      res.status(404).send(`
        <!DOCTYPE html>
        <html><head><title>Link Not Found</title>
        <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;}
        .box{text-align:center;padding:2rem;background:white;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.08);}
        h1{color:#ef4444;}p{color:#64748b;}</style></head>
        <body><div class="box"><h1>Link Not Found</h1><p>This QR link is invalid or has expired.</p></div></body></html>
      `);
      return;
    }
    throw err;
  }
});
