import { Router } from 'express';

import authenticateUser from '../middleware/authenticateUser';
import authorizeRoles from '../middleware/authorizeRoles';
import searchController from '../controllers/searchController';
import ROLES from '../utils/roles';

const searchRouter = Router();
const controler = searchController();

searchRouter
  .get('/', authenticateUser, authorizeRoles(ROLES.VIEWER), controler.get);

export default searchRouter;
