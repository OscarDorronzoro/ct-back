import breedRepository from './breed.repository';
import breedService from './breed.service';

function breedController() {
  async function get(req, res, next) {
    try {
      const { breedId } = req.validated.params;

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
      const breed = { name: req.validated.body.name };

      const breedCreated = await breedService.create(breed);

      return res.status(201)
        .json({ breed: breedCreated });
    } catch (err) {
      return next(err);
    }
  }

  async function put(req, res, next) {
    const { breedId } = req.validated.params;

    try {
      const values = {
        name: req.validated.body.name,
        updatedAt: new Date(),
      };

      const breed = await breedService.update(breedId, values);

      return res.status(200).json(breed);
    } catch (err) {
      return next(err);
    }
  }

  async function del(req, res, next) {
    const { breedId } = req.validated.params;

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
