import { Router } from 'express';

import authenticateUser from '../middleware/authenticateUser';
import ROLES from '../utils/roles';
import authorizeRoles from '../middleware/authorizeRoles';
import manageMulti from '../middleware/manageMulti';

import cowController from '../controllers/cowController';

const cowRouter = Router();
const controller = cowController();

cowRouter
  .get('/', controller.getAll)
  .get('/:cowId', controller.get)
  .post('/', authenticateUser, authorizeRoles(ROLES.OPERATOR), manageMulti.single('image'), controller.post)
  .put('/:cowId', authenticateUser, authorizeRoles(ROLES.OPERATOR), manageMulti.single('image'), controller.put)
  .delete('/:cowId', authenticateUser, authorizeRoles(ROLES.OPERATOR), controller.del);

export default cowRouter;
