import { Router } from 'express';

import zoneController from './zone.controller';

import authorize from '../identity/authorize.middleware';
import validate from '../../shared/middleware/validate.middleware';
import {
  zoneParams, zoneListQuery, createZoneBody, updateZoneBody,
} from './zone.validator';

const zoneRouter = Router();
const controller = zoneController();

// Every route reads; writes need their own permission too
zoneRouter.use(authorize('map:read'));

zoneRouter
  .get('/', validate({ query: zoneListQuery }), controller.getAll)
  .get('/types', controller.getTypes)
  .get('/:zoneId', validate({ params: zoneParams }), controller.get)
  .post('/', authorize('zones:write'), validate({ body: createZoneBody }), controller.post)
  .put(
    '/:zoneId',
    authorize('zones:write'),
    validate({ params: zoneParams, body: updateZoneBody }),
    controller.put,
  )
  .delete('/:zoneId', authorize('zones:write'), validate({ params: zoneParams }), controller.del);

export default zoneRouter;
