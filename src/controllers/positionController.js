import logger from '../utils/logger';
import positionRepository from '../repositories/positionRepository';

function positionController() {
  async function get(req, res) {
    try {
      let dateTo = new Date();
      const dateToParam = new Date(req.query.dateTo);
      if (!Number.isNaN(dateToParam.getTime())) {
        dateTo = dateToParam;
      }

      let dateFrom = new Date().setHours(0, 0, 0, 0);
      const dateFromParam = new Date(req.query.dateFrom);
      if (!Number.isNaN(dateFromParam.getTime())) {
        dateFrom = dateFromParam;
      }

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
      const error = {
        message: err.message,
        name: err.name,
        stack: err.stack,
      };
      logger.error(err);

      return res.status(503)
        .json(error);
    }
  }

  return { get };
}

export default positionController;
