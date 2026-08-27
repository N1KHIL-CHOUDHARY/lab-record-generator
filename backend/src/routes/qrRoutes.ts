import { Router } from 'express';
import { createQr, updateQrLink, getAnalytics } from '../controllers/qrController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createQrValidation, updateQrValidation } from '../validators/qrValidators.js';

const router = Router();

router.use(protect);

router.post('/', validate(createQrValidation), createQr);
router.get('/analytics', getAnalytics);
router.patch('/:shortId', validate(updateQrValidation), updateQrLink);

export default router;
