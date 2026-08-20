import breedRepository from '../repositories/breedRepository';
import breedService from '../services/breedService';
import validator from '../utils/validator';

function breedController() {
  async function get(req, res, next) {
    try {
      const breedId = validator.parsePositiveInteger(req.params.breedId);

      if (breedId === null) {
        return res.status(400)
          .json({ error: 'id required' });
      }

      const breed = await breedRepository.findById(breedId);

      if (!breed) {
        return res.status(404)
          .json({ error: 'Breed not found' });
      }

      return res.status(200)
        .json(breed);
    } catch (err) {
      return next(err);
    }
  }

  async function getAll(req, res, next) {
    try {
      const breeds = await breedRepository.findAll();

      return res.status(200)
        .json(breeds);
    } catch (err) {
      return next(err);
    }
  }

  async function post(req, res, next) {
    try {
      const { body } = req;

      const breed = {};

      if (!validator.isNonEmptyString(body.name)) {
        return res.status(400)
          .json({ error: 'name is required' });
      }
      breed.name = body.name.trim();

      const breedCreated = await breedService.create(breed);

      return res.status(201)
        .json({ breed: breedCreated });
    } catch (err) {
      return next(err);
    }
  }

  async function put(req, res, next) {
    const breedId = validator.parsePositiveInteger(req.params.breedId);

    if (breedId === null) {
      return res.status(400)
        .json({ error: 'id required' });
    }

    try {
      const { body } = req;

      const values = {};

      if (!validator.isNonEmptyString(body.name)) {
        return res.status(400)
          .json({ error: 'name is required' });
      }
      values.name = body.name.trim();

      values.updatedAt = new Date();

      const breed = await breedService.update(breedId, values);

      return res.status(200).json(breed);
    } catch (err) {
      return next(err);
    }
  }

  async function del(req, res, next) {
    const breedId = validator.parsePositiveInteger(req.params.breedId);

    if (breedId === null) {
      return res.status(400)
        .json({ error: 'id required' });
    }

    try {
      await breedService.delete(breedId);

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

export default breedController;
