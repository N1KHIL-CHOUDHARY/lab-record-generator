import { body, param } from 'express-validator';
import { isValidGitHubUrl } from '../utils/githubValidator.js';

export const createExperimentValidation = [
  param('subjectId').isMongoId().withMessage('Invalid subject ID'),
  body('experimentNo').isInt({ min: 1 }).withMessage('Experiment number must be a positive integer'),
  body('experimentName').trim().notEmpty().withMessage('Experiment name is required'),
  body('experimentDate').isISO8601().withMessage('Valid experiment date is required'),
  body('githubLink')
    .trim()
    .notEmpty()
    .withMessage('GitHub link is required')
    .custom((value) => {
      if (!isValidGitHubUrl(value)) {
        throw new Error('Must be a valid GitHub repository URL');
      }
      return true;
    }),
];

export const updateExperimentValidation = [
  param('id').isMongoId().withMessage('Invalid experiment ID'),
  body('experimentName').optional().trim().notEmpty(),
  body('experimentDate').optional().isISO8601(),
  body('githubLink')
    .optional()
    .trim()
    .custom((value) => {
      if (value && !isValidGitHubUrl(value)) {
        throw new Error('Must be a valid GitHub repository URL');
      }
      return true;
    }),
];

export const reorderExperimentsValidation = [
  param('subjectId').isMongoId().withMessage('Invalid subject ID'),
  body('order').isArray({ min: 1 }).withMessage('Order array is required'),
  body('order.*').isMongoId().withMessage('Each item must be a valid experiment ID'),
];
