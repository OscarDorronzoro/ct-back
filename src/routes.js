import { Router } from 'express';

import authenticateUser from './modules/identity/authenticateUser.middleware';

import rfRouter from './modules/telemetry/rf.routes';
import cowRouter from './modules/livestock/cow.routes';
import positionRouter from './modules/monitoring/position.routes';
import authRouter from './modules/identity/auth.routes';
import groupRouter from './modules/livestock/group.routes';
import collarRouter from './modules/devices/collar.routes';
import breedRouter from './modules/livestock/breed.routes';
import userRouter from './modules/identity/user.routes';
import searchRouter from './modules/monitoring/search.routes';
import commandRouter from './modules/devices/command.routes';
import firmwareRouter from './modules/devices/firmware.routes';
import zoneRouter from './modules/monitoring/zone.routes';

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
router.use('/commands', commandRouter);
router.use('/firmwares', firmwareRouter);
router.use('/zones', zoneRouter);

export default router;
