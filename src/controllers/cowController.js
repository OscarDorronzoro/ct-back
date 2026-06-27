import Cow from '../models/CowModel';
import logger from '../utils/logger';

import cowRepository from '../repositories/cowRepository';

function cowController() {
  /*
  const toRad = (value) => (value * Math.PI) / 180;

  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radio de la Tierra en m

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(lat1))
      * Math.cos(toRad(lat2))
      * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  async function getPositionsForDay(collarId, date) {
    const start = new Date(`${date}T00:00:00Z`);
    const end = new Date(`${date}T23:59:59Z`);

    return RawRfMessage.findAll({
      where: {
        collarId,
        recordedAt: {
          [Op.between]: [start, end],
        },
        invalid: 0,
      },
      order: [['recordedAt', 'ASC']],
    });
  }

  function calculateDistanceMeters(positions) {
    let total = 0;

    for (let i = 1; i < positions.length; i += 1) {
      const prev = positions[i - 1];
      const curr = positions[i];

      const d = haversine(
        Number(prev.latitude),
        Number(prev.longitude),
        Number(curr.latitude),
        Number(curr.longitude),
      );

      total += d;
    }

    return Number(total.toFixed(3)); // km con 3 decimales
  }

  async function getDistance(req, res) {
    try {
      const today = new Date();
      let date = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
      if (req.query.date) {
        date = req.query.date;
      }

      const positions = await getPositionsForDay(req.params.cowId, date);
      const distanceWalked = calculateDistanceMeters(positions);

      res.status(200);
      return res.json({ cowId: req.params.cowId, date, distanceWalked });
    } catch (err) {
      const error = {
        message: err.message,
        name: err.name,
        stack: err.stack,
      };
      return res.status(503)
        .json(error);
    }
  } */

  async function get(req, res) {
    try {
      const cowId = Number(req.params.cowId);
      if (!req.params.cowId || Number.isNaN(cowId)) return;

      const cow = await cowRepository.findById(cowId);

      if (!cow) {
        res.status(404)
          .json({ message: 'Cow not found' });
      }

      res.status(200)
        .json(cow);
    } catch (err) {
      const error = {
        message: err.message,
        name: err.name,
        stack: err.stack,
      };
      logger.error(err);

      res.status(503)
        .json(error);
    }
  }

  async function get2(req, res) {
    try {
      const cowId = Number(req.params.cowId);
      if (!req.params.cowId || Number.isNaN(cowId)) return;

      const cow = await Cow.findOne({
        where: { id: cowId },
      });

      if (!cow) {
        res.status(404)
          .json({ message: 'Cow not found' });
      }

      res.status(200)
        .json(cow);
    } catch (err) {
      const error = {
        message: err.message,
        name: err.name,
        stack: err.stack,
      };
      logger.error(err);

      res.status(503)
        .json(error);
    }
  }

  async function post(req, res) {
    try {
      const { body } = req;

      const c = {};

      if (body.breedId) {
        c.breedId = body.breedId;
      }
      if (body.earTag) {
        c.earTag = body.earTag;
      }
      if (body.alias) {
        c.alias = body.alias;
      }
      if (body.imageUrl) {
        c.imageUrl = body.imageUrl;
      }

      const cow = await Cow.create(c);

      return res.status(201)
        .json({ cow: cow.id, status: 'OK' });
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

  async function getAll(req, res) {
    try {
      const cows = await Cow.findAll();

      res.status(200)
        .json(cows);
    } catch (err) {
      const error = {
        message: err.message,
        name: err.name,
        stack: err.stack,
      };
      logger.error(err);

      res.status(503)
        .json(error);
    }
  }

  return {
    get, get2, post, getAll,
  };
}

export default cowController;
