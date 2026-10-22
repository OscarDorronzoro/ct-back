import { Router } from 'express';

import firmwareController from './firmware.controller';

import manageFirmwareUpload from './firmwareUpload.middleware';
import authorize from '../identity/authorize.middleware';
import validate from '../../shared/middleware/validate.middleware';
import { firmwareParams, createFirmwareBody } from './firmware.validator';

const firmwareRouter = Router();
const controller = firmwareController();

// Every route reads; writes need their own permission too
firmwareRouter.use(authorize('collars:read'));

firmwareRouter
  .get('/', controller.getAll)
  .get('/:firmwareId', validate({ params: firmwareParams }), controller.get)
  // multer first: it fills req.body from the multipart form
  .post(
    '/',
    authorize('firmware:manage'),
    manageFirmwareUpload.single('file'),
    validate({ body: createFirmwareBody }),
    controller.post,
  )
  .delete(
    '/:firmwareId',
    authorize('firmware:manage'),
    validate({ params: firmwareParams }),
    controller.del,
  );

export default firmwareRouter;
