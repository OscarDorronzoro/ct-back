import { Router } from 'express';

import firmwareController from './firmware.controller';

import manageFirmwareUpload from './firmwareUpload.middleware';
import authorizeRoles from '../identity/authorizeRoles.middleware';
import ROLES from '../identity/roles.constants';
import validate from '../../shared/middleware/validate.middleware';
import { firmwareParams, createFirmwareBody } from './firmware.validator';

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
