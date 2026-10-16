import { Router } from 'express';

import zoneController from './zone.controller';

import authorizeRoles from '../identity/authorizeRoles.middleware';
import ROLES from '../identity/roles.constants';
import validate from '../../shared/middleware/validate.middleware';
import {
  zoneParams, zoneListQuery, createZoneBody, updateZoneBody,
} from './zone.validator';

const zoneRouter = Router();
const controller = zoneController();

zoneRouter
  .get('/', validate({ query: zoneListQuery }), controller.getAll)
  .get('/types', controller.getTypes)
  .get('/:zoneId', validate({ params: zoneParams }), controller.get)
  .post('/', authorizeRoles(ROLES.OPERATOR), validate({ body: createZoneBody }), controller.post)
  .put(
    '/:zoneId',
    authorizeRoles(ROLES.OPERATOR),
    validate({ params: zoneParams, body: updateZoneBody }),
    controller.put,
  )
  .delete('/:zoneId', authorizeRoles(ROLES.OPERATOR), validate({ params: zoneParams }), controller.del);

export default zoneRouter;
