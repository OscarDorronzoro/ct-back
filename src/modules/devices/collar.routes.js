import { Router } from 'express';

import collarController from './collar.controller';

import authorizeRoles from '../identity/authorizeRoles.middleware';
import ROLES from '../identity/roles.constants';
import validate from '../../shared/middleware/validate.middleware';
import { collarParams, collarBody } from './collar.validator';

const collarRouter = Router();
const controller = collarController();

collarRouter
  .get('/', controller.getAll)
  .get('/:collarId', validate({ params: collarParams }), controller.get)
  .post('/', authorizeRoles(ROLES.OPERATOR), validate({ body: collarBody }), controller.post)
  .put(
    '/:collarId',
    authorizeRoles(ROLES.OPERATOR),
    validate({ params: collarParams, body: collarBody }),
    controller.put,
  )
  .delete('/:collarId', authorizeRoles(ROLES.OPERATOR), validate({ params: collarParams }), controller.del);

export default collarRouter;
