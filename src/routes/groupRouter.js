import { Router } from 'express';

import groupController from '../controllers/groupController';

import authorizeRoles from '../middleware/authorizeRoles';
import ROLES from '../utils/roles';
import validate from '../middleware/validate';
import { groupParams, groupBody } from '../validators/groupValidator';

const groupRouter = Router();
const controller = groupController();

groupRouter
  .get('/', controller.getAll)
  .get('/:groupId', validate({ params: groupParams }), controller.get)
  .post('/', authorizeRoles(ROLES.OPERATOR), validate({ body: groupBody }), controller.post)
  .put(
    '/:groupId',
    authorizeRoles(ROLES.OPERATOR),
    validate({ params: groupParams, body: groupBody }),
    controller.put,
  )
  .delete('/:groupId', authorizeRoles(ROLES.OPERATOR), validate({ params: groupParams }), controller.del);

export default groupRouter;
