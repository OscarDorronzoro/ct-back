import { Router } from 'express';

import collarController from '../controllers/collarController';

import authorizeRoles from '../middleware/authorizeRoles';
import ROLES from '../utils/roles';
import validate from '../middleware/validate';
import { collarParams, collarBody } from '../validators/collarValidator';

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
