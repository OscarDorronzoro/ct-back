import { Router } from 'express';

import breedController from './breed.controller';

import authorize from '../identity/authorize.middleware';
import validate from '../../shared/middleware/validate.middleware';
import { breedParams, breedBody } from './breed.validator';

const breedRouter = Router();
const controller = breedController();

// Every route reads; writes need their own permission too
breedRouter.use(authorize('cows:read'));

breedRouter
  .get('/', controller.getAll)
  .get('/:breedId', validate({ params: breedParams }), controller.get)
  .post('/', authorize('cows:write'), validate({ body: breedBody }), controller.post)
  .put(
    '/:breedId',
    authorize('cows:write'),
    validate({ params: breedParams, body: breedBody }),
    controller.put,
  )
  .delete('/:breedId', authorize('cows:write'), validate({ params: breedParams }), controller.del);

export default breedRouter;
