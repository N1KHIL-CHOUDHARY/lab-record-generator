import { Router } from 'express';
import authRoutes from './authRoutes.js';
import subjectRoutes from './subjectRoutes.js';
import experimentRoutes from './experimentRoutes.js';
import recordRoutes from './recordRoutes.js';
import historyRoutes from './historyRoutes.js';
import qrRoutes from './qrRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/subjects', subjectRoutes);
router.use('/experiments', experimentRoutes);
router.use('/records', recordRoutes);
router.use('/history', historyRoutes);
router.use('/qr', qrRoutes);

export default router;
