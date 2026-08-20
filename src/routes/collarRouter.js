import { Router } from 'express';

import authenticateUser from '../middleware/authenticateUser';
import collarController from '../controllers/collarController';

const collarRouter = Router();
const controller = collarController();

collarRouter
  .get('/', controller.getAll)
  .get('/:collarId', controller.get)
  .post('/', authenticateUser, controller.post)
  .put('/:collarId', authenticateUser, controller.put)
  .delete('/:collarId', authenticateUser, controller.del);

export default collarRouter;
