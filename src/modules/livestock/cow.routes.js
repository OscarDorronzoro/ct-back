import { Router } from 'express';

import cowController from './cow.controller';

import manageMulti from './imageUpload.middleware';
import authorize, { authorizeAny } from '../identity/authorize.middleware';
import validate from '../../shared/middleware/validate.middleware';
import { cowParams, cowBody } from './cow.validator';

const cowRouter = Router();
const controller = cowController();

// Every route reads. Creating and deleting is cow data; an edit can be only the collar
// (the controller checks the permission of each field).
cowRouter.use(authorize('cows:read'));

cowRouter
  .get('/', controller.getAll)
  .get('/:cowId', validate({ params: cowParams }), controller.get)
  // multer first: it fills req.body from the multipart form
  .post(
    '/',
    authorize('cows:write'),
    manageMulti.single('image'),
    validate({ body: cowBody }),
    controller.post,
  )
  .put(
    '/:cowId',
    authorizeAny('cows:write', 'cows:assignCollar'),
    manageMulti.single('image'),
    validate({ params: cowParams, body: cowBody }),
    controller.put,
  )
  .delete('/:cowId', authorize('cows:write'), validate({ params: cowParams }), controller.del);

export default cowRouter;
