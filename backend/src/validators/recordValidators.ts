import { body, param } from 'express-validator';

export const generateRecordValidation = [
  body('subjectId').isMongoId().withMessage('Valid subject ID is required'),
];

export const previewSubjectValidation = [
  param('subjectId').isMongoId().withMessage('Valid subject ID is required'),
];

export const recordIdValidation = [
  param('id').isMongoId().withMessage('Invalid record ID'),
];
