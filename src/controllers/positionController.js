import positionRepository from '../repositories/positionRepository';

function positionController() {
  async function get(req, res, next) {
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
            lt: new Date(dateTo),
            gte: new Date(dateFrom),
          },
        },
      });

      return res.json(positions);
    } catch (err) {
      return next(err);
    }
  }

  return { get };
}

export default positionController;
