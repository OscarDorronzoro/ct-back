import { Router } from 'express';

import userController from '../controllers/userController';

import authorizeRoles from '../middleware/authorizeRoles';
import ROLES from '../utils/roles';
import validate from '../middleware/validate';
import {
  userParams, userSessionParams, createUserBody, updateUserBody,
} from '../validators/userValidator';

const userRouter = Router();
const controller = userController();

userRouter.use(authorizeRoles(ROLES.ADMIN));

userRouter
  .get('/', controller.getAll)
  .get('/:userId', validate({ params: userParams }), controller.get)
  .post('/', validate({ body: createUserBody }), controller.post)
  .put('/:userId', validate({ params: userParams, body: updateUserBody }), controller.put)
  .delete('/:userId', validate({ params: userParams }), controller.del)
  .get('/:userId/sessions', validate({ params: userParams }), controller.getSessions)
  .delete('/:userId/sessions', validate({ params: userParams }), controller.delSessions)
  .delete(
    '/:userId/sessions/:sessionId',
    validate({ params: userSessionParams }),
    controller.delSession,
  );

export default userRouter;
