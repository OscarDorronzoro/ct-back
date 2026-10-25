import { Router } from 'express';
import nController from './notification.controller';
import validate from '../../shared/middleware/validate.middleware';
import authorize from '../identity/authorize.middleware';
import { subscriptionBody, endpointBody, endpointQuery } from './notification.validator';

const notificationRouter = Router();
const notificationController = nController();

// Who sees the map receives the alerts of the cows
notificationRouter.use(authorize('map:read'));

notificationRouter
  .get('/push/key', notificationController.getPushKey)
  .get('/push/subscription', validate({ query: endpointQuery }), notificationController.getSubscription)
  .put('/push/subscription', validate({ body: subscriptionBody }), notificationController.subscribe)
  .delete('/push/subscription', validate({ body: endpointBody }), notificationController.unsubscribe)
  .post('/push/test', notificationController.sendTest);

export default notificationRouter;
