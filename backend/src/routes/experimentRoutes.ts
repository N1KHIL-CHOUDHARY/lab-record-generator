import { Router } from 'express';
import {
  createExperiment,
  updateExperiment,
  deleteExperiment,
  reorderExperiments,
} from '../controllers/experimentController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createExperimentValidation,
  updateExperimentValidation,
  reorderExperimentsValidation,
} from '../validators/experimentValidators.js';

const router = Router();

router.use(protect);

router.post(
  '/:subjectId',
  validate(createExperimentValidation),
  createExperiment
);
router.put('/:id', validate(updateExperimentValidation), updateExperiment);
router.delete('/:id', updateExperiment);
router.patch(
  '/:subjectId/reorder',
  validate(reorderExperimentsValidation),
  reorderExperiments
);

export default router;
