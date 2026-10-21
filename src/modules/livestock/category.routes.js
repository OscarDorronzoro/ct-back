import { Router } from 'express';

import categoryController from './category.controller';

const categoryRouter = Router();
const controller = categoryController();

// Fixed list, loaded with the database schema
categoryRouter
  .get('/', controller.getAll);

export default categoryRouter;
