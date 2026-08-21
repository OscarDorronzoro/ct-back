import { Router } from 'express';

import authorizeRoles from '../middleware/authorizeRoles';
import searchController from '../controllers/searchController';
import ROLES from '../utils/roles';

const searchRouter = Router();
const controler = searchController();

searchRouter
  .get('/', authorizeRoles(ROLES.VIEWER), controler.get);

export default searchRouter;
