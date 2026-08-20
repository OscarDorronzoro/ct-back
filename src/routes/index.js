import { Router } from 'express';
import rfRouter from './rfRouter';
import cowRouter from './cowRouter';
import positionRouter from './positionRouter';
import authRouter from './authRouter';
import groupRouter from './groupRouter';
import collarRouter from './collarRouter';
import breedRouter from './breedRouter';
import userRouter from './userRouter';
import searchRouter from './searchRouter';

const router = Router();

router.use('/rf', rfRouter);
router.use('/cows', cowRouter);
router.use('/positions', positionRouter);
router.use('/auth', authRouter);
router.use('/groups', groupRouter);
router.use('/collars', collarRouter);
router.use('/breeds', breedRouter);
router.use('/users', userRouter);
router.use('/search', searchRouter);

export default router;
