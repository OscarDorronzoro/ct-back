import { Router } from 'express';
import posController from './position.controller';
import validate from '../../shared/middleware/validate.middleware';
import {
  positionParams, positionListQuery, latestPositionsQuery,
} from './position.validator';

const positionRouter = Router();
const positionController = posController();

positionRouter
  .get('/', validate({ query: positionListQuery }), positionController.get)
  .get('/latest', validate({ query: latestPositionsQuery }), positionController.getLatest)
  .get('/:positionId', validate({ params: positionParams }), positionController.getById);

export default positionRouter;
