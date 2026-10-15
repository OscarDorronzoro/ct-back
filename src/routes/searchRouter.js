import { Router } from 'express';

import authorizeRoles from '../middleware/authorizeRoles';
import searchController from '../controllers/searchController';
import ROLES from '../utils/roles';
import validate from '../middleware/validate';
import searchQuery from '../validators/searchValidator';

const searchRouter = Router();
const controler = searchController();

searchRouter
  .get('/', authorizeRoles(ROLES.VIEWER), validate({ query: searchQuery }), controler.get);

export default searchRouter;
