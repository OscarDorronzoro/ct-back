import { Router } from 'express';
import authController from '../controllers/authController';
import authenticateUser from '../middleware/authenticateUser';
import validate from '../middleware/validate';
import { loginBody } from '../validators/authValidator';

const authRouter = Router();
const controller = authController();

authRouter
  .get('/me', authenticateUser, controller.me)
  .post('/login', validate({ body: loginBody }), controller.login)
  .post('/refresh', controller.refresh)
  .post('/logout', controller.logout);

export default authRouter;
