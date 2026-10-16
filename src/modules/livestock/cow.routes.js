import { Router } from 'express';

import cowController from './cow.controller';

import manageMulti from './imageUpload.middleware';
import authorizeRoles from '../identity/authorizeRoles.middleware';
import ROLES from '../identity/roles.constants';
import validate from '../../shared/middleware/validate.middleware';
import { cowParams, cowBody } from './cow.validator';

const cowRouter = Router();
const controller = cowController();

cowRouter
  .get('/', controller.getAll)
  .get('/:cowId', validate({ params: cowParams }), controller.get)
  // multer first: it fills req.body from the multipart form
  .post(
    '/',
    authorizeRoles(ROLES.OPERATOR),
    manageMulti.single('image'),
    validate({ body: cowBody }),
    controller.post,
  )
  .put(
    '/:cowId',
    authorizeRoles(ROLES.OPERATOR),
    manageMulti.single('image'),
    validate({ params: cowParams, body: cowBody }),
    controller.put,
  )
  .delete('/:cowId', authorizeRoles(ROLES.OPERATOR), validate({ params: cowParams }), controller.del);

export default cowRouter;
