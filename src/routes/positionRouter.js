import { Router } from 'express';
import posController from '../controllers/positionController';

const positionRouter = Router();
const positionController = posController();

positionRouter
  .get('/', positionController.get);

export default positionRouter;
