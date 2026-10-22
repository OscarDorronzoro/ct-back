import { Router } from 'express';

import categoryController from './category.controller';
import authorize from '../identity/authorize.middleware';

const categoryRouter = Router();
const controller = categoryController();

// Fixed list, loaded with the database schema
categoryRouter.use(authorize('cows:read'));

categoryRouter
  .get('/', controller.getAll);

export default categoryRouter;
