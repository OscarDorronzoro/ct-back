import userService from './user.service';
import sessionService from './session.service';

function userController() {
  async function get(req, res, next) {
    try {
      const { userId } = req.validated.params;

      const user = await userService.get(userId);

      return res.status(200).json(user);
    } catch (err) {
      return next(err);
    }
  }

  async function getAll(req, res, next) {
    try {
      const users = await userService.getAll();

      return res.status(200)
        .json(users);
    } catch (err) {
      return next(err);
    }
  }

  async function post(req, res, next) {
    try {
      // { username, password, roles } (roles defaults to viewer)
      const userCreated = await userService.create(req.validated.body);

      return res.status(201)
        .json({ user: userCreated });
    } catch (err) {
      return next(err);
    }
  }

  async function put(req, res, next) {
    const { userId } = req.validated.params;

    try {
      // { password?, roles? }
      const userUpdated = await userService.update(userId, req.validated.body, req.user);

      return res.status(200)
        .json({ user: userUpdated });
    } catch (err) {
      return next(err);
    }
  }

  async function del(req, res, next) {
    const { userId } = req.validated.params;

    try {
      await userService.delete(userId, req.user);

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  }

  async function getSessions(req, res, next) {
    try {
      const { userId } = req.validated.params;

      const sessions = await sessionService.getActive(userId, req.user);

      return res.status(200).json(sessions);
    } catch (err) {
      return next(err);
    }
  }

  async function delSession(req, res, next) {
    try {
      const { userId, sessionId } = req.validated.params;

      await sessionService.revoke(userId, sessionId);

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  }

  async function delSessions(req, res, next) {
    try {
      const { userId } = req.validated.params;

      const revoked = await sessionService.revokeAll(userId, req.user);

      return res.status(200).json({ revoked });
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
    getSessions,
    delSession,
    delSessions,
  };
}

export default userController;
