import { body, param } from 'express-validator';

export const createSubjectValidation = [
  body('subjectName').trim().notEmpty().withMessage('Subject title is required'),
  body('subjectCode').trim().notEmpty().withMessage('Subject code is required'),
  body('subjectCodeAlt').optional().trim(),
  body('studentName').trim().notEmpty().withMessage('Student name is required'),
  body('registerNumber').trim().notEmpty().withMessage('Register number is required'),
];

export const updateSubjectValidation = [
  param('id').isMongoId().withMessage('Invalid subject ID'),
  body('subjectName').optional().trim().notEmpty(),
  body('subjectCode').optional().trim().notEmpty(),
  body('subjectCodeAlt').optional().trim(),
  body('studentName').optional().trim().notEmpty(),
  body('registerNumber').optional().trim().notEmpty(),
];

export const subjectIdValidation = [
  param('id').isMongoId().withMessage('Invalid subject ID'),
];
