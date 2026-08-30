import { body, param } from 'express-validator';

export function isValidDestinationUrl(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  try {
    const url = new URL(val.trim());
    // Only allow http and https protocols to prevent javascript: or arbitrary local schemes
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const createQrValidation = [
  body('targetUrl')
    .optional()
    .trim()
    .custom((value, { req }) => {
      const url = value || req.body.originalUrl || req.body.destinationUrl;
      if (!url) {
        throw new Error('targetUrl (or destinationUrl) is required');
      }
      if (!isValidDestinationUrl(url)) {
        throw new Error('Must be a valid HTTP or HTTPS destination URL');
      }
      return true;
    }),
  body('destinationUrl').optional().trim(),
  body('originalUrl').optional().trim(),
];

export const updateQrValidation = [
  param('shortId').trim().notEmpty().withMessage('Short code is required'),
  body('targetUrl')
    .optional()
    .trim()
    .custom((value, { req }) => {
      const url = value || req.body.originalUrl || req.body.destinationUrl;
      if (!url) {
        throw new Error('targetUrl (or destinationUrl) is required');
      }
      if (!isValidDestinationUrl(url)) {
        throw new Error('Must be a valid HTTP or HTTPS destination URL');
      }
      return true;
    }),
  body('destinationUrl').optional().trim(),
  body('originalUrl').optional().trim(),
];
