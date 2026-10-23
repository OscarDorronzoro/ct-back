import { Router } from 'express';

import healthController from './health.controller';
import authorize from '../identity/authorize.middleware';
import validate from '../../shared/middleware/validate.middleware';
import {
  cowParams, eventParams, productParams, createEventBody, voidEventBody,
  createProductBody, updateProductBody, productListQuery,
} from './health.validator';

const controller = healthController();

// /api/health: clinical history of the cows and its products.
// Every route reads; recording, voiding and editing products needs health:write.
const healthRouter = Router();

healthRouter.use(authorize('health:read'));

healthRouter
  .get('/cows/:cowId', validate({ params: cowParams }), controller.getCowHealth)
  .post(
    '/cows/:cowId/events',
    authorize('health:write'),
    validate({ params: cowParams, body: createEventBody }),
    controller.postEvent,
  )
  .post(
    '/events/:eventId/void',
    authorize('health:write'),
    validate({ params: eventParams, body: voidEventBody }),
    controller.voidEvent,
  )
  .get('/products', validate({ query: productListQuery }), controller.getProducts)
  .get('/products/:productId', validate({ params: productParams }), controller.getProduct)
  .post('/products', authorize('health:write'), validate({ body: createProductBody }), controller.postProduct)
  .put(
    '/products/:productId',
    authorize('health:write'),
    validate({ params: productParams, body: updateProductBody }),
    controller.putProduct,
  );

export default healthRouter;
