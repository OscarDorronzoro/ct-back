import { Router } from 'express';

import groupController from './group.controller';

import authorize from '../identity/authorize.middleware';
import validate from '../../shared/middleware/validate.middleware';
import { groupParams, groupBody } from './group.validator';

const groupRouter = Router();
const controller = groupController();

// Every route reads; writes need their own permission too
groupRouter.use(authorize('cows:read'));

groupRouter
  .get('/', controller.getAll)
  .get('/:groupId', validate({ params: groupParams }), controller.get)
  .post('/', authorize('cows:write'), validate({ body: groupBody }), controller.post)
  .put(
    '/:groupId',
    authorize('cows:write'),
    validate({ params: groupParams, body: groupBody }),
    controller.put,
  )
  .delete('/:groupId', authorize('cows:write'), validate({ params: groupParams }), controller.del);

export default groupRouter;
