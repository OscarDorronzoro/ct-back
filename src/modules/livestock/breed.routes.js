import { Router } from 'express';

import breedController from './breed.controller';

import authorizeRoles from '../identity/authorizeRoles.middleware';
import ROLES from '../identity/roles.constants';
import validate from '../../shared/middleware/validate.middleware';
import { breedParams, breedBody } from './breed.validator';

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
