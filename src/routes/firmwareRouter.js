import { Router } from 'express';

import firmwareController from '../controllers/firmwareController';

import manageFirmwareUpload from '../middleware/manageFirmwareUpload';
import authorizeRoles from '../middleware/authorizeRoles';
import ROLES from '../utils/roles';
import validate from '../middleware/validate';
import { firmwareParams, createFirmwareBody } from '../validators/firmwareValidator';

const firmwareRouter = Router();
const controller = firmwareController();

firmwareRouter
  .get('/', controller.getAll)
  .get('/:firmwareId', validate({ params: firmwareParams }), controller.get)
  // multer first: it fills req.body from the multipart form
  .post(
    '/',
    authorizeRoles(ROLES.OPERATOR),
    manageFirmwareUpload.single('file'),
    validate({ body: createFirmwareBody }),
    controller.post,
  )
  .delete(
    '/:firmwareId',
    authorizeRoles(ROLES.OPERATOR),
    validate({ params: firmwareParams }),
    controller.del,
  );

export default firmwareRouter;
