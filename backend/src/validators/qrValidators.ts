import { body, param } from 'express-validator';

function isValidDestinationUrl(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  try {
    const url = new URL(val.trim());
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
      const url = value || req.body.originalUrl;
      if (!url) {
        throw new Error('targetUrl is required');
      }
      if (!isValidDestinationUrl(url)) {
        throw new Error('Must be a valid HTTP or HTTPS destination URL');
      }
      return true;
    }),
  body('originalUrl')
    .optional()
    .trim(),
];

export const updateQrValidation = [
  param('shortId').trim().notEmpty().withMessage('Short ID is required'),
  body('targetUrl')
    .optional()
    .trim()
    .custom((value, { req }) => {
      const url = value || req.body.originalUrl;
      if (!url) {
        throw new Error('targetUrl is required');
      }
      if (!isValidDestinationUrl(url)) {
        throw new Error('Must be a valid HTTP or HTTPS destination URL');
      }
      return true;
    }),
  body('originalUrl')
    .optional()
    .trim(),
];
