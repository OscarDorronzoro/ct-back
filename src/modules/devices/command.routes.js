import { Router } from 'express';

import commandController from './command.controller';

import authorizeRoles from '../identity/authorizeRoles.middleware';
import ROLES from '../identity/roles.constants';
import validate from '../../shared/middleware/validate.middleware';
import {
  commandParams, commandListQuery, createCommandBody,
} from './command.validator';

const commandRouter = Router();
const controller = commandController();

commandRouter
  .get('/', validate({ query: commandListQuery }), controller.getAll)
  .get('/:commandId', validate({ params: commandParams }), controller.get)
  .post('/', authorizeRoles(ROLES.OPERATOR), validate({ body: createCommandBody }), controller.post)
  .post(
    '/:commandId/cancel',
    authorizeRoles(ROLES.OPERATOR),
    validate({ params: commandParams }),
    controller.cancel,
  );

export default commandRouter;
