import collarRepository from '../repositories/collarRepository';
import collarService from '../services/collarService';
import validator from '../utils/validator';

function collarController() {
  async function get(req, res, next) {
    try {
      const collarId = validator.parsePositiveInteger(req.params.collarId);

      if (collarId === null) {
        return res.status(400)
          .json({ error: 'id required' });
      }

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
      const { body } = req;

      const c = {};

      if (!body.firmwareVersion) {
        return res.status(400)
          .json({ error: 'firmwareVersion is required' });
      }

      c.firmwareVersion = body.firmwareVersion;

      if (body.description) {
        c.description = body.description;
      }

      const collarCreated = await collarRepository.create(c);

      return res.status(201)
        .json({ collar: collarCreated });
    } catch (err) {
      return next(err);
    }
  }

  async function put(req, res, next) {
    const collarId = validator.parsePositiveInteger(req.params.collarId);

    if (collarId === null) {
      return res.status(400)
        .json({ error: 'id required' });
    }

    try {
      const { body } = req;

      const c = {};

      if (body.firmwareVersion) {
        c.firmwareVersion = body.firmwareVersion;
      }

      if (body.description) {
        c.description = body.description;
      }

      const collar = await collarRepository.update(collarId, c);

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
    const collarId = validator.parsePositiveInteger(req.params.collarId);

    if (collarId === null) {
      return res.status(400)
        .json({ error: 'id required' });
    }

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
