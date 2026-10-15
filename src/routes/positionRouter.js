import { Router } from 'express';
import posController from '../controllers/positionController';
import validate from '../middleware/validate';
import {
  positionParams, positionListQuery, latestPositionsQuery,
} from '../validators/positionValidator';

const positionRouter = Router();
const positionController = posController();

positionRouter
  .get('/', validate({ query: positionListQuery }), positionController.get)
  .get('/latest', validate({ query: latestPositionsQuery }), positionController.getLatest)
  .get('/:positionId', validate({ params: positionParams }), positionController.getById);

export default positionRouter;
