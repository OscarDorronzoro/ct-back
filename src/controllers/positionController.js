import { Op } from 'sequelize';
import Position from '../models/PositionModel';
import logger from '../utils/logger';

function positionController() {
  async function get(req, res) {
    try {
      const query = {
        where: {
        },
      };

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

      query.where.recordedAt = {
        [Op.lt]: dateTo,
        [Op.gte]: dateFrom,
      };

      const positions = await Position.findAll(
        query,
      );

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
