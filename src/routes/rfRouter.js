import { Router } from 'express';
import rawRfMsgController from '../controllers/rawRfMessageController';

import gatewayAuth from '../middleware/gatewayAuth';
// import authenticateUser from '../middleware/authenticateUser';

const rfRouter = Router();
const rawRfMessageController = rawRfMsgController();

rfRouter
  .get('/', rawRfMessageController.get)
  .post('/', gatewayAuth, rawRfMessageController.post);

export default rfRouter;
