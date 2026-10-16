import { Router } from 'express';
import rawRfMsgController from './rawRfMessage.controller';

import gatewayAuth from './gatewayAuth.middleware';
import authenticateUser from '../identity/authenticateUser.middleware';
import validate from '../../shared/middleware/validate.middleware';
import { commandResultsBody } from '../devices/command.validator';
import { firmwareCodeParams } from '../devices/firmware.validator';
import rawRfMessageValidator, { rawRfMessageListQuery } from './rawRfMessage.validator';

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
