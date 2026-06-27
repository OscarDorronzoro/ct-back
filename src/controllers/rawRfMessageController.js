import { Op } from 'sequelize';

import RawRfMessage from '../models/RawRfMessageModel';
import logger from '../utils/logger';

function rawRfMessageController() {
  async function get(req, res) {
    try {
      const query = {
        where: {
        },
      };

      let dateTo = new Date();
      const dateToParam = new Date(req.query.dateTo);
      if (req.query.dateTo && !Number.isNaN(dateToParam.getTime())) {
        dateTo = dateToParam.toISOString();
      }

      let dateFrom = new Date();
      dateFrom.setTime(dateFrom.getTime() - 1000 * 60 * 60 * 3);
      const dateFromParam = new Date(req.query.dateFrom);
      if (!Number.isNaN(dateFromParam.getTime())) {
        dateFrom = dateFromParam.toISOString();
      }

      query.where.recordedAt = {
        [Op.lt]: new Date(dateTo),
        [Op.gte]: new Date(dateFrom),
      };

      const rawRfMessages = await RawRfMessage.findAll(
        query,
      );

      return res.json(rawRfMessages);
    } catch (err) {
      const error = {
        message: err.message,
        name: err.name,
        stack: err.stack,
      };
      logger.warn(err);

      return res.status(503)
        .json(error);
    }
  }

  async function post(req, res) {
    try {
      const { body } = req;

      if (!body || !body.collarId) {
        return res.status(400)
          .json({ error: 'collarId is requiered' });
      }

      if (!body || body.latitude === undefined) {
        return res.status(400)
          .json({ error: 'latitude is requiered' });
      }

      if (!body || body.longitude === undefined) {
        return res.status(400)
          .json({ error: 'longitude is requiered' });
      }

      // Check data validity </Marker>
      let invalid = 0;
      if (body.latitude < -90 || body.latitude > 90) {
        body.latitude = -1;
        invalid = 1;
      }
      if (body.longitude < -180 || body.longitude > 180) {
        body.longitude = -1;
        invalid = 1;
      }
      if (
        (body.latitude > -32.8 || body.latitude < -33)
        && body.latitude !== 0
        && body.latitude !== -1
      ) {
        invalid = 2;
      }
      if (
        (body.longitude > -61.1 || body.longitude < -61.3)
        && body.longitude !== 0
        && body.longitude !== -1
      ) {
        invalid = 2;
      }
      if (body.latitude === 0 && body.longitude === 0) {
        invalid = 3;
      }

      const loc = {};
      loc.collarId = body.collarId;
      loc.latitude = body.latitude;
      loc.longitude = body.longitude;
      loc.recordedAt = body.recordedAt;
      loc.invalidReasonId = invalid;

      if (!body.recordedAt) {
        loc.recordedAt = new Date();
      }

      if (body.speed) {
        loc.speed = body.speed;
      }

      if (body.altitude) {
        loc.altitude = body.altitude;
      }

      if (body.satellitesCount) {
        loc.satellitesCount = body.satellitesCount;
      }

      if (body.hdop) {
        loc.hdop = body.hdop;
      }

      if (body.rssi) {
        loc.rssi = body.rssi;
      }

      if (body.snr) {
        loc.snr = body.snr;
      }

      if (body.voltage) {
        loc.voltage = body.voltage;
      }

      if (body.crc) {
        loc.crc = body.crc;
      }

      if (body.gatewayId) {
        loc.gatewayId = body.gatewayId;
      }

      const rawRfMessage = await RawRfMessage.create(loc);
      return res.status(202) // 202 Accepted. The request has been received but not yet acted upon
        .json({
          rawRfMessage: rawRfMessage.id,
          status: rawRfMessage.invalidReasonId === 0 ? 'queued' : 'invalid',
          invalidReasonId: rawRfMessage.invalidReasonId,
        });
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

  return { get, post };
}

export default rawRfMessageController;
