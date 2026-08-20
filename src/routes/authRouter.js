import { Router } from 'express';
import authController from '../controllers/authController';
import authenticateUser from '../middleware/authenticateUser';

const authRouter = Router();
const controller = authController();

authRouter
  .get('/me', authenticateUser, controller.me)
  .post('/login', controller.login)
  .post('/refresh', controller.refresh)
  .post('/logout', controller.logout);

export default authRouter;
