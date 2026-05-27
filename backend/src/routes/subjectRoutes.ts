import { Router } from 'express';
import {
  createSubject,
  getSubjects,
  getSubject,
  updateSubject,
  deleteSubject,
} from '../controllers/subjectController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createSubjectValidation,
  updateSubjectValidation,
  subjectIdValidation,
} from '../validators/subjectValidators.js';

const router = Router();

router.use(protect);

router.post('/', validate(createSubjectValidation), createSubject);
router.get('/', getSubjects);
router.get('/:id', validate(subjectIdValidation), getSubject);
router.put('/:id', validate(updateSubjectValidation), updateSubject);
router.delete('/:id', validate(subjectIdValidation), deleteSubject);

export default router;
