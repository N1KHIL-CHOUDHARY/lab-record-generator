import { Router } from 'express';
import {
  createRecord,
  getDashboard,
  previewRecord,
} from '../controllers/recordController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  generateRecordValidation,
  previewSubjectValidation,
} from '../validators/recordValidators.js';

const router = Router();

router.use(protect);

router.get('/dashboard', getDashboard);
router.get('/preview/:subjectId', validate(previewSubjectValidation), previewRecord);
router.post('/', validate(generateRecordValidation), createRecord);

export default router;
