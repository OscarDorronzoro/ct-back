import { Router } from 'express';

import commandController from '../controllers/commandController';

import authorizeRoles from '../middleware/authorizeRoles';
import ROLES from '../utils/roles';
import validate from '../middleware/validate';
import {
  commandParams, commandListQuery, createCommandBody,
} from '../validators/commandValidator';

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
