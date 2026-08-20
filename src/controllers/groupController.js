import groupRepository from '../repositories/groupRepository';
import validator from '../utils/validator';

function groupController() {
  async function get(req, res, next) {
    try {
      const groupId = validator.parsePositiveInteger(req.params.groupId);

      if (groupId === null) {
        return res.status(400)
          .json({ error: 'id required' });
      }

      const group = await groupRepository.findById(groupId);

      if (!group) {
        return res.status(404)
          .json({ error: 'Group not found' });
      }

      return res.status(200)
        .json(group);
    } catch (err) {
      return next(err);
    }
  }

  async function getAll(req, res, next) {
    try {
      const groups = await groupRepository.findAll();

      return res.status(200)
        .json(groups);
    } catch (err) {
      return next(err);
    }
  }

  async function post(req, res, next) {
    try {
      const { body } = req;

      const g = {};

      if (body.name) {
        g.name = body.name;
      }

      if (body.description) {
        g.description = body.description;
      }

      const groupCreated = await groupRepository.create(g);

      return res.status(201)
        .json({ group: groupCreated });
    } catch (err) {
      return next(err);
    }
  }

  async function put(req, res, next) {
    const groupId = validator.parsePositiveInteger(req.params.groupId);

    if (groupId === null) {
      return res.status(400)
        .json({ error: 'id required' });
    }

    try {
      const { body } = req;

      const g = {};

      if (body.name) {
        g.name = body.name;
      }

      if (body.description) {
        g.description = body.description;
      }

      const group = await groupRepository.update(groupId, g);

      if (!group) {
        return res.status(404)
          .json({ error: 'Group not found' });
      }

      return res.status(200)
        .json({ group });
    } catch (err) {
      return next(err);
    }
  }

  async function del(req, res, next) {
    const groupId = validator.parsePositiveInteger(req.params.groupId);

    if (groupId === null) {
      return res.status(400)
        .json({ error: 'id required' });
    }

    try {
      const group = await groupRepository.delete(groupId);

      if (!group) {
        return res.status(404)
          .json({ error: 'Group not found' });
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

export default groupController;
