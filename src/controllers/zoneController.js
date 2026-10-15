import zoneService from '../services/zoneService';

function zoneController() {
  async function getAll(req, res, next) {
    try {
      const where = {};
      const { zoneTypeId } = req.validated.query;

      if (zoneTypeId !== undefined) {
        where.zoneTypeId = { eq: zoneTypeId };
      }

      const zones = await zoneService.getAll({ where });

      return res.status(200)
        .json(zones);
    } catch (err) {
      return next(err);
    }
  }

  async function getTypes(req, res, next) {
    try {
      const zoneTypes = await zoneService.getTypes();

      return res.status(200)
        .json(zoneTypes);
    } catch (err) {
      return next(err);
    }
  }

  async function get(req, res, next) {
    try {
      const { zoneId } = req.validated.params;

      const zone = await zoneService.get(zoneId);

      if (!zone) {
        return res.status(404)
          .json({ error: 'Zone not found' });
      }

      return res.status(200)
        .json(zone);
    } catch (err) {
      return next(err);
    }
  }

  async function post(req, res, next) {
    try {
      const zone = await zoneService.create(req.validated.body);

      return res.status(201)
        .json({ zone });
    } catch (err) {
      return next(err);
    }
  }

  async function put(req, res, next) {
    const { zoneId } = req.validated.params;

    try {
      const zone = await zoneService.update(zoneId, req.validated.body);

      if (!zone) {
        return res.status(404)
          .json({ error: 'Zone not found' });
      }

      return res.status(200)
        .json({ zone });
    } catch (err) {
      return next(err);
    }
  }

  async function del(req, res, next) {
    const { zoneId } = req.validated.params;

    try {
      const zone = await zoneService.delete(zoneId);

      if (!zone) {
        return res.status(404)
          .json({ error: 'Zone not found' });
      }

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  }

  return {
    getAll,
    getTypes,
    get,
    post,
    put,
    del,
  };
}

export default zoneController;
