import { Router } from 'express';

import groupController from './group.controller';

import authorizeRoles from '../identity/authorizeRoles.middleware';
import ROLES from '../identity/roles.constants';
import validate from '../../shared/middleware/validate.middleware';
import { groupParams, groupBody } from './group.validator';

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
