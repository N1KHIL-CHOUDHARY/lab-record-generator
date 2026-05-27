import { Router } from 'express';
import { getRecordHistory, deleteRecord } from '../controllers/recordController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { recordIdValidation } from '../validators/recordValidators.js';

const router = Router();

router.use(protect);

router.get('/', getRecordHistory);
router.delete('/:id', validate(recordIdValidation), deleteRecord);

export default router;
