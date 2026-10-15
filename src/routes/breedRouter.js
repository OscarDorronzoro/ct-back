import { Router } from 'express';

import breedController from '../controllers/breedController';

import authorizeRoles from '../middleware/authorizeRoles';
import ROLES from '../utils/roles';
import validate from '../middleware/validate';
import { breedParams, breedBody } from '../validators/breedValidator';

const breedRouter = Router();
const controller = breedController();

breedRouter
  .get('/', controller.getAll)
  .get('/:breedId', validate({ params: breedParams }), controller.get)
  .post('/', authorizeRoles(ROLES.OPERATOR), validate({ body: breedBody }), controller.post)
  .put(
    '/:breedId',
    authorizeRoles(ROLES.OPERATOR),
    validate({ params: breedParams, body: breedBody }),
    controller.put,
  )
  .delete('/:breedId', authorizeRoles(ROLES.OPERATOR), validate({ params: breedParams }), controller.del);

export default breedRouter;
