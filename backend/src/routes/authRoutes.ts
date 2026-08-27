import { Router } from 'express';
import { googleAuth, getGoogleAuth, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { googleAuthValidation } from '../validators/authValidators.js';

const router = Router();

router.get('/google', getGoogleAuth);
router.post('/google', validate(googleAuthValidation), googleAuth);
router.get('/me', protect, getMe);

export default router;
