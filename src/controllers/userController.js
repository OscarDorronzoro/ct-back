import userService from '../services/userService';
import ROLES from '../utils/roles';
import validator from '../utils/validator';

function userController() {
  async function get(req, res, next) {
    try {
      const userId = validator.parsePositiveInteger(req.params.userId);

      if (userId === null) {
        return res.status(400)
          .json({ error: 'invalid userId' });
      }

      const user = await userService.get(userId);

      return res.status(200).json({ user });
    } catch (err) {
      return next(err);
    }
  }

  async function getAll(req, res, next) {
    try {
      const users = await userService.findAll();

      return res.status(200)
        .json({ users });
    } catch (err) {
      return next(err);
    }
  }

  async function post(req, res, next) {
    try {
      const { body } = req;
      const authenticatedUser = req.user;
      const user = {};

      if (!validator.isNonEmptyString(body.username)) {
        return res.status(400)
          .json({ error: 'username required' });
      }

      if (!validator.isNonEmptyString(body.password)) {
        return res.status(400)
          .json({ error: 'password required' });
      }

      user.username = body.username;
      user.password = body.password;

      user.role = ROLES.VIEWER;

      if (body.role !== undefined) {
        const role = validator.parseRole(body.role);

        if (role === null) {
          return res.status(400)
            .json({ error: 'invalid role' });
        }

        user.role = role;
      }

      const userCreated = await userService.create(user, authenticatedUser.role);

      return res.status(201)
        .json({ user: userCreated });
    } catch (err) {
      return next(err);
    }
  }

  async function put(req, res, next) {
    const authenticatedUser = req.user;
    const userId = validator.parsePositiveInteger(req.params.userId);

    if (userId === null) {
      return res.status(400)
        .json({ error: 'invalid userId' });
    }

    try {
      const { body } = req;

      const user = {};

      if (body.password !== undefined) {
        if (!validator.isNonEmptyString(body.password)) {
          return res.status(400)
            .json({ error: 'invalid password' });
        }

        user.password = body.password;
      }

      if (body.role !== undefined) {
        const role = validator.parseRole(body.role);

        if (role === null) {
          return res.status(400)
            .json({ error: 'invalid role' });
        }

        user.role = role;
      }

      const userUpdated = await userService.update(userId, user, authenticatedUser.role);

      return res.status(200)
        .json({ user: userUpdated });
    } catch (err) {
      return next(err);
    }
  }

  async function del(req, res, next) {
    const authenticatedUser = req.user;
    const userId = validator.parsePositiveInteger(req.params.userId);

    if (userId === null) {
      return res.status(400)
        .json({ error: 'invalid userId' });
    }

    try {
      await userService.delete(userId, authenticatedUser.role);

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

export default userController;
