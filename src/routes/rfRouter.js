import { Router } from 'express';
import rawRfMsgController from '../controllers/rawRfMessageController';

const router = Router();
const rawRfMessageController = rawRfMsgController();

router
  .get('/', rawRfMessageController.get)
  .post('/', rawRfMessageController.post);

export default router;
