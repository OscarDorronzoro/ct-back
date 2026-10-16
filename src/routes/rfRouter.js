import { Router } from 'express';
import rawRfMsgController from '../controllers/rawRfMessageController';

import gatewayAuth from '../middleware/gatewayAuth';
import authenticateUser from '../middleware/authenticateUser';
import validate from '../middleware/validate';
import { commandResultsBody } from '../validators/commandValidator';
import { firmwareCodeParams } from '../validators/firmwareValidator';
import rawRfMessageValidator, { rawRfMessageListQuery } from '../validators/rawRfMessageValidator';

const rfRouter = Router();
const rawRfMessageController = rawRfMsgController();

rfRouter
  .get('/', authenticateUser, validate({ query: rawRfMessageListQuery }), rawRfMessageController.get)
  .post('/', gatewayAuth, validate({ body: rawRfMessageValidator }), rawRfMessageController.post)
  .post(
    '/commands/results',
    gatewayAuth,
    validate({ body: commandResultsBody }),
    rawRfMessageController.postResults,
  )
  .get(
    '/firmwares/:code',
    gatewayAuth,
    validate({ params: firmwareCodeParams }),
    rawRfMessageController.getFirmware,
  );

export default rfRouter;
