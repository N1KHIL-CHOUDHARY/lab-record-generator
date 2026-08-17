import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { handleRedirect } from '../services/qrService.js';
import { AppError } from '../utils/AppError.js';

export const redirectShortLink = asyncHandler(async (req: Request, res: Response) => {
  const shortId = String(req.params.shortId || '').trim();

  if (!shortId || shortId.length < 3) {
    if (req.accepts('html')) {
      res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Link Not Found</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #09090b; color: #f4f4f5; }
            .box { text-align: center; padding: 2.5rem; background: #18181b; border: 1px solid #27272a; border-radius: 1rem; max-width: 420px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h1 { color: #ef4444; font-size: 1.5rem; margin-bottom: 0.5rem; }
            p { color: #a1a1aa; font-size: 0.95rem; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="box">
            <h1>Invalid QR Link</h1>
            <p>The short link provided is malformed or invalid.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }
    throw new AppError('Invalid link', 400);
  }

  try {
    const targetUrl = await handleRedirect(shortId);
    return res.redirect(302, targetUrl);
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 404) {
      if (req.accepts('html')) {
        res.status(404).send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>QR Link Not Found</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #09090b; color: #f4f4f5; }
              .box { text-align: center; padding: 2.5rem; background: #18181b; border: 1px solid #27272a; border-radius: 1rem; max-width: 420px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
              h1 { color: #ef4444; font-size: 1.5rem; margin-bottom: 0.5rem; }
              p { color: #a1a1aa; font-size: 0.95rem; line-height: 1.5; }
            </style>
          </head>
          <body>
            <div class="box">
              <h1>Link Not Found</h1>
              <p>This dynamic QR code destination is invalid, unpublished, or has been removed.</p>
            </div>
          </body>
          </html>
        `);
        return;
      }
      res.status(404).json({ success: false, message: 'QR link not found' });
      return;
    }
    throw err;
  }
});
