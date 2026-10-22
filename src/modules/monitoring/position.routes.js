import { Router } from 'express';
import posController from './position.controller';
import validate from '../../shared/middleware/validate.middleware';
import authorize from '../identity/authorize.middleware';
import {
  positionParams, positionListQuery, latestPositionsQuery, distanceQuery,
} from './position.validator';

const positionRouter = Router();
const positionController = posController();

positionRouter.use(authorize('map:read'));

positionRouter
  .get('/', validate({ query: positionListQuery }), positionController.get)
  .get('/latest', validate({ query: latestPositionsQuery }), positionController.getLatest)
  .get('/distance', validate({ query: distanceQuery }), positionController.getDistance)
  .get('/:positionId', validate({ params: positionParams }), positionController.getById);

export default positionRouter;
