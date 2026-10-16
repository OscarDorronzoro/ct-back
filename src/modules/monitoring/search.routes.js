import { Router } from 'express';

import authorizeRoles from '../identity/authorizeRoles.middleware';
import searchController from './search.controller';
import ROLES from '../identity/roles.constants';
import validate from '../../shared/middleware/validate.middleware';
import searchQuery from './search.validator';

const searchRouter = Router();
const controler = searchController();

searchRouter
  .get('/', authorizeRoles(ROLES.VIEWER), validate({ query: searchQuery }), controler.get);

export default searchRouter;
