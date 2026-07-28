import logger from '../utils/logger';
import cowRepository from '../repositories/cowRepository';

function cowController() {
  async function get(req, res) {
    try {
      const cowId = Number(req.params.cowId);
      if (!req.params.cowId || Number.isNaN(cowId)) return;

      const cow = await cowRepository.findById(cowId);

      if (!cow) {
        res.status(404)
          .json({ message: 'Cow not found' });
      }

      res.status(200)
        .json(cow);
    } catch (err) {
      const error = {
        message: err.message,
        name: err.name,
        stack: err.stack,
      };
      logger.error(err);

      res.status(503)
        .json(error);
    }
  }

  async function post(req, res) {
    try {
      const { body } = req;

      const c = {};

      if (body.breedId) {
        c.breedId = body.breedId;
      }
      if (body.earTag) {
        c.earTag = body.earTag;
      }
      if (body.alias) {
        c.alias = body.alias;
      }
      if (body.imageUrl) {
        c.imageUrl = body.imageUrl;
      }

      const cow = await cowRepository.create(c);

      return res.status(201)
        .json({ cow: cow.id, status: 'OK' });
    } catch (err) {
      const error = {
        message: err.message,
        name: err.name,
        stack: err.stack,
      };
      logger.error(err);

      return res.status(503)
        .json(error);
    }
  }

  async function getAll(req, res) {
    try {
      const cows = await cowRepository.findAll();

      res.status(200)
        .json(cows);
    } catch (err) {
      const error = {
        message: err.message,
        name: err.name,
        stack: err.stack,
      };
      logger.error(err);

      res.status(503)
        .json(error);
    }
  }

  return {
    get, post, getAll,
  };
}

export default cowController;
