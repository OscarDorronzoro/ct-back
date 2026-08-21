import { Router } from 'express';

import collarController from '../controllers/collarController';

import authorizeRoles from '../middleware/authorizeRoles';
import ROLES from '../utils/roles';

const collarRouter = Router();
const controller = collarController();

collarRouter
  .get('/', controller.getAll)
  .get('/:collarId', controller.get)
  .post('/', authorizeRoles(ROLES.OPERATOR), controller.post)
  .put('/:collarId', authorizeRoles(ROLES.OPERATOR), controller.put)
  .delete('/:collarId', authorizeRoles(ROLES.OPERATOR), controller.del);

export default collarRouter;
