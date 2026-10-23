import { Router } from 'express';

import explorerController from './explorer.controller';
import validate from '../../shared/middleware/validate.middleware';
import { explorerQueryBody, explorerValuesQuery } from './explorer.validator';

const controller = explorerController();

// /api/analytics: everyone authenticated; each dataset asks for its own permission (catalog)
const explorerRouter = Router();

explorerRouter
  .get('/catalog', controller.getCatalog)
  // POST: the query is a JSON document, not a few query string parameters
  .post('/query', validate({ body: explorerQueryBody }), controller.postQuery)
  .get('/values', validate({ query: explorerValuesQuery }), controller.getValues);

export default explorerRouter;
