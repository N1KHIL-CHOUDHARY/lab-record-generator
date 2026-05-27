import { body, param } from 'express-validator';
import { isValidGitHubUrl } from '../utils/githubValidator.js';

export const updateQrValidation = [
  param('shortId').trim().notEmpty().withMessage('Short ID is required'),
  body('originalUrl')
    .trim()
    .notEmpty()
    .custom((value) => {
      if (!isValidGitHubUrl(value)) {
        throw new Error('Must be a valid GitHub repository URL');
      }
      return true;
    }),
];
