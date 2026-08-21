import { Router } from 'express';

import cowController from '../controllers/cowController';

import manageMulti from '../middleware/manageMulti';
import authorizeRoles from '../middleware/authorizeRoles';
import ROLES from '../utils/roles';

const cowRouter = Router();
const controller = cowController();

cowRouter
  .get('/', controller.getAll)
  .get('/:cowId', controller.get)
  .post('/', authorizeRoles(ROLES.OPERATOR), manageMulti.single('image'), controller.post)
  .put('/:cowId', authorizeRoles(ROLES.OPERATOR), manageMulti.single('image'), controller.put)
  .delete('/:cowId', authorizeRoles(ROLES.OPERATOR), controller.del);

export default cowRouter;
