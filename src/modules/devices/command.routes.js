import { Router } from 'express';

import commandController from './command.controller';

import authorize from '../identity/authorize.middleware';
import validate from '../../shared/middleware/validate.middleware';
import {
  commandParams, commandListQuery, createCommandBody,
} from './command.validator';

const commandRouter = Router();
const controller = commandController();

// Every route reads; writes need their own permission too
commandRouter.use(authorize('collars:read'));

commandRouter
  .get('/', validate({ query: commandListQuery }), controller.getAll)
  .get('/:commandId', validate({ params: commandParams }), controller.get)
  .post('/', authorize('commands:send'), validate({ body: createCommandBody }), controller.post)
  // Any sender can cancel a pending command (it only stops it)
  .post(
    '/:commandId/cancel',
    authorize('commands:send'),
    validate({ params: commandParams }),
    controller.cancel,
  );

export default commandRouter;
