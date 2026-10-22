import { Router } from 'express';
import wController from './weather.controller';
import validate from '../../shared/middleware/validate.middleware';
import authorize from '../identity/authorize.middleware';
import weatherListQuery from './weather.validator';

const weatherRouter = Router();
const weatherController = wController();

weatherRouter.use(authorize('map:read'));

weatherRouter
  .get('/', validate({ query: weatherListQuery }), weatherController.get)
  .get('/latest', weatherController.getLatest);

export default weatherRouter;
