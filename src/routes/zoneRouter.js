import { Router } from 'express';

import zoneController from '../controllers/zoneController';

import authorizeRoles from '../middleware/authorizeRoles';
import ROLES from '../utils/roles';
import validate from '../middleware/validate';
import {
  zoneParams, zoneListQuery, createZoneBody, updateZoneBody,
} from '../validators/zoneValidator';

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
