import cowService from '../services/cowService';
import validator from '../utils/validator';

function cowController() {
  async function get(req, res, next) {
    try {
      const cowId = validator.parsePositiveInteger(req.params.cowId);

      if (cowId === null) {
        return res.status(400)
          .json({ error: 'id required' });
      }

      const cow = await cowService.get(cowId);

      if (!cow) {
        return res.status(404)
          .json({ error: 'Cow not found' });
      }

      return res.status(200)
        .json(cow);
    } catch (err) {
      return next(err);
    }
  }

  async function getAll(req, res, next) {
    try {
      const cows = await cowService.getAll();

      return res.status(200)
        .json(cows);
    } catch (err) {
      return next(err);
    }
  }

  async function post(req, res, next) {
    try {
      const { body } = req;

      const cow = {};
      const cowData = {};

      if (body.breedId) {
        cow.breedId = body.breedId;
      }
      if (body.currentCollarId !== undefined) {
        cow.currentCollarId = body.currentCollarId;
      }
      if (body.earTag) {
        cow.earTag = body.earTag;
      }
      if (body.alias) {
        cow.alias = body.alias;
      }
      if (body.birthDate) {
        cow.birthDate = body.birthDate;
      }
      if (req.file) {
        cowData.image = req.file;
      }

      if (Object.hasOwn(body, 'groupIds')) {
        if (!Array.isArray(body.groupIds)) {
          return res.status(400)
            .json({ error: 'groupIds must be an array' });
        }

        const groupIds = body.groupIds.map(Number);
        if (groupIds.some((id) => !Number.isInteger(id) || id <= 0)) {
          return res.status(400)
            .json({ error: 'groupIds must only contain positive integers' });
        }

        cowData.groupIds = [...new Set(groupIds)];
      }

      const cowCreated = await cowService.create(cow, cowData);

      return res.status(201)
        .json({ cow: cowCreated });
    } catch (err) {
      return next(err);
    }
  }

  async function put(req, res, next) {
    const cowId = validator.parsePositiveInteger(req.params.cowId);

    if (cowId === null) {
      return res.status(400)
        .json({ error: 'id required' });
    }

    try {
      const { body } = req;

      const cow = {};
      const cowData = {};

      if (validator.parsePositiveInteger(body.breedId)) {
        cow.breedId = validator.parsePositiveInteger(body.breedId);
      }
      if (body.currentCollarId !== undefined) {
        cow.currentCollarId = validator.parsePositiveInteger(body.currentCollarId);
      }
      if (body.earTag) {
        cow.earTag = body.earTag;
      }
      if (body.alias) {
        cow.alias = body.alias;
      }
      if (body.birthDate) {
        cow.birthDate = body.birthDate;
      }
      if (req.file) {
        cowData.image = req.file;
      }

      if (Object.hasOwn(body, 'groupIds')) {
        if (!Array.isArray(body.groupIds)) {
          return res.status(400)
            .json({ error: 'groupIds must be an array' });
        }

        const groupIds = body.groupIds.map(Number);
        if (groupIds.some((id) => !Number.isInteger(id) || id <= 0)) {
          return res.status(400)
            .json({ error: 'groupIds must only contain positive integers' });
        }

        cowData.groupIds = [...new Set(groupIds)];
      }

      cow.updatedAt = new Date();

      const cowReturned = await cowService.update(cowId, cow, cowData);

      return res.status(200)
        .json({ cow: cowReturned });
    } catch (err) {
      return next(err);
    }
  }

  async function del(req, res, next) {
    const cowId = validator.parsePositiveInteger(req.params.cowId);

    if (cowId === null) {
      return res.status(400)
        .json({ error: 'id required' });
    }

    try {
      const cow = await cowService.delete(cowId);

      if (!cow) {
        return res.status(404)
          .json({ error: 'Cow not found' });
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

export default cowController;
