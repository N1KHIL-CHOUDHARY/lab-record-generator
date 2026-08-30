import { body, param } from 'express-validator';
import { isValidGitHubUrl } from '../utils/githubValidator.js';

export const createExperimentValidation = [
  param('subjectId').trim().notEmpty().withMessage('Valid subject ID is required'),
  body('experimentNo').isInt({ min: 1 }).withMessage('Experiment number must be a positive integer'),
  body('experimentName').trim().notEmpty().withMessage('Experiment name is required'),
  body('experimentDate').optional({ checkFalsy: true }).isISO8601().withMessage('Valid experiment date is required'),
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
  param('id').trim().notEmpty().withMessage('Valid experiment ID is required'),
  body('experimentName').optional({ checkFalsy: true }).trim().notEmpty(),
  body('experimentDate').optional({ checkFalsy: true }).isISO8601().withMessage('Valid experiment date is required'),
  body('githubLink')
    .optional({ checkFalsy: true })
    .trim()
    .custom((value) => {
      if (value && !isValidGitHubUrl(value)) {
        throw new Error('Must be a valid GitHub repository URL');
      }
      return true;
    }),
];

export const reorderExperimentsValidation = [
  param('subjectId').trim().notEmpty().withMessage('Valid subject ID is required'),
  body('order').isArray({ min: 1 }).withMessage('Order array is required'),
  body('order.*').trim().notEmpty().withMessage('Each item must be a valid experiment ID'),
];