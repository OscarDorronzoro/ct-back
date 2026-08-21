import { Router } from 'express';

import groupController from '../controllers/groupController';

import authorizeRoles from '../middleware/authorizeRoles';
import ROLES from '../utils/roles';

const groupRouter = Router();
const controller = groupController();

groupRouter
  .get('/', controller.getAll)
  .get('/:groupId', controller.get)
  .post('/', authorizeRoles(ROLES.OPERATOR), controller.post)
  .put('/:groupId', authorizeRoles(ROLES.OPERATOR), controller.put)
  .delete('/:groupId', authorizeRoles(ROLES.OPERATOR), controller.del);

export default groupRouter;
