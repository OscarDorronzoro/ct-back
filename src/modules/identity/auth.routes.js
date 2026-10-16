import { Router } from 'express';
import authController from './auth.controller';
import authenticateUser from './authenticateUser.middleware';
import validate from '../../shared/middleware/validate.middleware';
import { loginBody } from './auth.validator';

const authRouter = Router();
const controller = authController();

authRouter
  .get('/me', authenticateUser, controller.me)
  .post('/login', validate({ body: loginBody }), controller.login)
  .post('/refresh', controller.refresh)
  .post('/logout', controller.logout);

export default authRouter;
