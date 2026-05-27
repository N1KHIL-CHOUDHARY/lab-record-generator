import { body } from 'express-validator';

export const googleAuthValidation = [
  body('idToken').notEmpty().withMessage('Firebase ID token is required'),
];
