import firmwareService from '../services/firmwareService';

function firmwareController() {
  async function getAll(req, res, next) {
    try {
      const firmwares = await firmwareService.getAll();

      return res.status(200)
        .json(firmwares);
    } catch (err) {
      return next(err);
    }
  }

  async function get(req, res, next) {
    try {
      const { firmwareId } = req.validated.params;

      const firmware = await firmwareService.get(firmwareId);

      if (!firmware) {
        return res.status(404)
          .json({ error: 'Firmware not found' });
      }

      return res.status(200)
        .json(firmware);
    } catch (err) {
      return next(err);
    }
  }

  // multipart/form-data: file, code, version, notes
  async function post(req, res, next) {
    try {
      const firmware = await firmwareService.create(req.validated.body, req.file, req.user.sub);

      return res.status(201)
        .json({ firmware });
    } catch (err) {
      return next(err);
    }
  }

  async function del(req, res, next) {
    const { firmwareId } = req.validated.params;

    try {
      const firmware = await firmwareService.delete(firmwareId);

      if (!firmware) {
        return res.status(404)
          .json({ error: 'Firmware not found' });
      }

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  }

  return {
    getAll,
    get,
    post,
    del,
  };
}

export default firmwareController;
