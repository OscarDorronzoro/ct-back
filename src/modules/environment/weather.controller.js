import weatherRepository from './weather.repository';

function weatherController() {
  // Hourly series in the range
  async function get(req, res, next) {
    try {
      const observations = await weatherRepository.findInRange(req.validated.query);

      return res.json(observations);
    } catch (err) {
      return next(err);
    }
  }

  // Last stored hour
  async function getLatest(req, res, next) {
    try {
      const observation = await weatherRepository.findLatest();

      if (!observation) {
        return res.status(404)
          .json({ error: 'No weather data yet' });
      }

      return res.json(observation);
    } catch (err) {
      return next(err);
    }
  }

  return { get, getLatest };
}

export default weatherController;
