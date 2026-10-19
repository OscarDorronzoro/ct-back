import { Router } from 'express';
import wController from './weather.controller';
import validate from '../../shared/middleware/validate.middleware';
import weatherListQuery from './weather.validator';

const weatherRouter = Router();
const weatherController = wController();

weatherRouter
  .get('/', validate({ query: weatherListQuery }), weatherController.get)
  .get('/latest', weatherController.getLatest);

export default weatherRouter;
