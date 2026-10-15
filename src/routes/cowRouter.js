import { Router } from 'express';

import cowController from '../controllers/cowController';

import manageMulti from '../middleware/manageMulti';
import authorizeRoles from '../middleware/authorizeRoles';
import ROLES from '../utils/roles';
import validate from '../middleware/validate';
import { cowParams, cowBody } from '../validators/cowValidator';

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
