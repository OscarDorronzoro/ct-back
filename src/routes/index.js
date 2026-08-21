import { Router } from 'express';

import authenticateUser from '../middleware/authenticateUser';

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

// Public
router.use('/auth', authRouter);

// RF: authentication depends on HTTP method
router.use('/rf', rfRouter);

// Everything below requires user authentication
router.use(authenticateUser);

router.use('/cows', cowRouter);
router.use('/positions', positionRouter);
router.use('/groups', groupRouter);
router.use('/collars', collarRouter);
router.use('/breeds', breedRouter);
router.use('/users', userRouter);
router.use('/search', searchRouter);

export default router;
