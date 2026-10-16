import commandService from '../services/commandService';

function commandController() {
  async function getAll(req, res, next) {
    try {
      // { collarId?, limit? }
      const commands = await commandService.getAll(req.validated.query);

      return res.status(200)
        .json(commands);
    } catch (err) {
      return next(err);
    }
  }

  async function get(req, res, next) {
    try {
      const { commandId } = req.validated.params;

      const command = await commandService.get(commandId);

      if (!command) {
        return res.status(404)
          .json({ error: 'Command not found' });
      }

      return res.status(200)
        .json(command);
    } catch (err) {
      return next(err);
    }
  }

  // { type, target: 'all' | { collarIds: [...] }, ...fields of the type }
  async function post(req, res, next) {
    try {
      const command = await commandService.create(req.validated.body, req.user.sub);

      return res.status(202)
        .json({ command });
    } catch (err) {
      return next(err);
    }
  }

  async function cancel(req, res, next) {
    try {
      const { commandId } = req.validated.params;

      const command = await commandService.cancel(commandId);

      return res.status(200)
        .json({ command });
    } catch (err) {
      return next(err);
    }
  }

  return {
    getAll,
    get,
    post,
    cancel,
  };
}

export default commandController;
