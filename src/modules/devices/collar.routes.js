import { Router } from 'express';

import collarController from './collar.controller';

import authorize from '../identity/authorize.middleware';
import validate from '../../shared/middleware/validate.middleware';
import { collarParams, collarBody } from './collar.validator';

const collarRouter = Router();
const controller = collarController();

// Every route reads; writes need their own permission too
collarRouter.use(authorize('collars:read'));

collarRouter
  .get('/', controller.getAll)
  .get('/:collarId', validate({ params: collarParams }), controller.get)
  .post('/', authorize('collars:write'), validate({ body: collarBody }), controller.post)
  .put(
    '/:collarId',
    authorize('collars:write'),
    validate({ params: collarParams, body: collarBody }),
    controller.put,
  )
  .delete('/:collarId', authorize('collars:write'), validate({ params: collarParams }), controller.del);

export default collarRouter;
