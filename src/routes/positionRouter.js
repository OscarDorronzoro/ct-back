import { Router } from 'express';
import posController from '../controllers/positionController';

const router = Router();
const positionController = posController();

router
  .get('/', positionController.get);

export default router;
