import { Router } from 'express';

import authenticateUser from '../middleware/authenticateUser';
import breedController from '../controllers/breedController';

const breedRouter = Router();
const controller = breedController();

breedRouter
  .get('/', controller.getAll)
  .get('/:breedId', controller.get)
  .post('/', authenticateUser, controller.post)
  .put('/:breedId', authenticateUser, controller.put)
  .delete('/:breedId', authenticateUser, controller.del);

export default breedRouter;
