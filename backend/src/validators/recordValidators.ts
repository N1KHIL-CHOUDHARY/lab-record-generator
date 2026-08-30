import { body, param } from 'express-validator';

export const generateRecordValidation = [
  body('subjectId').trim().notEmpty().withMessage('Valid subject ID is required'),
];

export const previewSubjectValidation = [
  param('subjectId').trim().notEmpty().withMessage('Valid subject ID is required'),
];

export const recordIdValidation = [
  param('id').trim().notEmpty().withMessage('Valid record ID is required'),
];
