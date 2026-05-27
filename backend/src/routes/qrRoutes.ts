import { Router } from 'express';
import { updateQrLink, getAnalytics } from '../controllers/qrController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateQrValidation } from '../validators/qrValidators.js';

const router = Router();

router.use(protect);

router.get('/analytics', getAnalytics);
router.patch('/:shortId', validate(updateQrValidation), updateQrLink);

export default router;
