import { Router } from 'express';
import rfRouter from './rfRouter';
import cowRouter from './cowRouter';
import positionRouter from './positionRouter';

const router = Router();

router.use('/rf', rfRouter);
router.use('/cow', cowRouter);
router.use('/position', positionRouter);

export default router;
