import { Router } from 'express';
import cController from '../controllers/cowController';

const router = Router();
const cowControler = cController();

router
  .get('/', cowControler.getAll)
  .get('/:cowId', cowControler.get);

export default router;
