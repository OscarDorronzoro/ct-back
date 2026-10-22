import { Router } from 'express';

import { authorizeAny } from '../identity/authorize.middleware';
import searchController from './search.controller';
import validate from '../../shared/middleware/validate.middleware';
import searchQuery from './search.validator';

const searchRouter = Router();
const controler = searchController();

searchRouter
  // Cows and collars: the service leaves out what the user can't read
  .get('/', authorizeAny('cows:read', 'collars:read'), validate({ query: searchQuery }), controler.get);

export default searchRouter;
