import collarRepository from '../repositories/collarRepository';
import collarService from '../services/collarService';

function collarController() {
  async function get(req, res, next) {
    try {
      const { collarId } = req.validated.params;

      const collar = await collarRepository.findById(collarId);

      if (!collar) {
        return res.status(404)
          .json({ error: 'Collar not found' });
      }

      return res.status(200)
        .json(collar);
    } catch (err) {
      return next(err);
    }
  }

  async function getAll(req, res, next) {
    try {
      const collars = await collarRepository.findAll();

      return res.status(200)
        .json(collars);
    } catch (err) {
      return next(err);
    }
  }

  async function post(req, res, next) {
    try {
      // { code?, mac?, firmwareVersion?, description? }, normalized
      const values = { ...req.validated.body };

      const collarCreated = await collarService.create(values);

      return res.status(201)
        .json({ collar: collarCreated });
    } catch (err) {
      return next(err);
    }
  }

  async function put(req, res, next) {
    const { collarId } = req.validated.params;

    try {
      const values = { ...req.validated.body };

      values.updatedAt = new Date();

      const collar = await collarService.update(collarId, values);

      if (!collar) {
        return res.status(404)
          .json({ error: 'Collar not found' });
      }

      return res.status(200)
        .json({ collar });
    } catch (err) {
      return next(err);
    }
  }

  async function del(req, res, next) {
    const { collarId } = req.validated.params;

    try {
      const collar = await collarService.delete(collarId);

      if (!collar) {
        return res.status(404)
          .json({ error: 'Collar not found' });
      }

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  }

  return {
    get,
    getAll,
    post,
    put,
    del,
  };
}

export default collarController;
