import { Router } from 'express';

import authenticateUser from '../middleware/authenticateUser';
import groupController from '../controllers/groupController';

const groupRouter = Router();
const controller = groupController();

groupRouter
  .get('/', controller.getAll)
  .get('/:groupId', controller.get)
  .post('/', authenticateUser, controller.post)
  .put('/:groupId', authenticateUser, controller.put)
  .delete('/:groupId', authenticateUser, controller.del);

export default groupRouter;
