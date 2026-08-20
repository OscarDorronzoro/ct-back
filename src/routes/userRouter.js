import { Router } from 'express';

import userController from '../controllers/userController';
import authenticateUser from '../middleware/authenticateUser';
import authorizeRoles from '../middleware/authorizeRoles';
import ROLES from '../utils/roles';

const userRouter = Router();
const controller = userController();

userRouter.use(authenticateUser);
userRouter.use(authorizeRoles(ROLES.ADMIN));

userRouter
  .get('/', controller.getAll)
  .get('/:userId', controller.get)
  .post('/', controller.post)
  .put('/:userId', controller.put)
  .delete('/:userId', controller.del);

export default userRouter;
