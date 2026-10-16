import positionRepository from './position.repository';
import positionService from './position.service';

function positionController() {
  async function get(req, res, next) {
    try {
      const { dateFrom, dateTo } = req.validated.query;

      const positions = await positionRepository.findAll({
        where: {
          recordedAt: {
            lt: dateTo,
            gte: dateFrom,
          },
        },
      });

      return res.json(positions);
    } catch (err) {
      return next(err);
    }
  }

  async function getLatest(req, res, next) {
    try {
      const { maxAgeHours } = req.validated.query;
      const since = new Date(Date.now() - maxAgeHours * 3600 * 1000);
      const positions = await positionRepository.findLatestByCollar(since);

      return res.json(positions);
    } catch (err) {
      return next(err);
    }
  }

  async function getById(req, res, next) {
    try {
      const { positionId } = req.validated.params;

      const details = await positionService.getDetails(positionId);

      if (!details) {
        return res.status(404)
          .json({ error: 'Position not found' });
      }

      return res.json(details);
    } catch (err) {
      return next(err);
    }
  }

  return { get, getLatest, getById };
}

export default positionController;
