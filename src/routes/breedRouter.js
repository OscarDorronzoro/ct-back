import { Router } from 'express';

import breedController from '../controllers/breedController';

import authorizeRoles from '../middleware/authorizeRoles';
import ROLES from '../utils/roles';

const breedRouter = Router();
const controller = breedController();

breedRouter
  .get('/', controller.getAll)
  .get('/:breedId', controller.get)
  .post('/', authorizeRoles(ROLES.OPERATOR), controller.post)
  .put('/:breedId', authorizeRoles(ROLES.OPERATOR), controller.put)
  .delete('/:breedId', authorizeRoles(ROLES.OPERATOR), controller.del);

export default breedRouter;
