import { Router } from 'express';
import { redirectShortLink } from '../controllers/redirectController.js';

const router = Router();

router.get('/:shortId', redirectShortLink);

export default router;
