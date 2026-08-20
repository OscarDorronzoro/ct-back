import rawRfMessageRepository from '../repositories/rawRfMessageRepository';

function rawRfMessageController() {
  async function get(req, res, next) {
    try {
      let dateTo = new Date();
      const dateToParam = new Date(req.query.dateTo);
      if (req.query.dateTo && !Number.isNaN(dateToParam.getTime())) {
        dateTo = dateToParam;
      }

      let dateFrom = new Date();
      dateFrom.setTime(dateFrom.getTime() - 1000 * 60 * 60 * 3);
      const dateFromParam = new Date(req.query.dateFrom);
      if (!Number.isNaN(dateFromParam.getTime())) {
        dateFrom = dateFromParam;
      }

      const rawRfMessages = await rawRfMessageRepository.findAll({
        where: {
          recordedAt: {
            lt: new Date(dateTo),
            gte: new Date(dateFrom),
          },
        },
      });

      return res.json(rawRfMessages);
    } catch (err) {
      return next(err);
    }
  }

  async function post(req, res, next) {
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

      const raw = {};
      raw.collarId = body.collarId;
      raw.latitude = body.latitude;
      raw.longitude = body.longitude;
      raw.location = {
        latitude: body.latitude,
        longitude: body.longitude,
      };
      raw.recordedAt = body.recordedAt;
      raw.invalidReasonId = invalid;

      if (!body.recordedAt) {
        raw.recordedAt = new Date();
      }

      if (body.speed !== undefined) {
        raw.speed = body.speed;
      }

      if (body.altitude !== undefined) {
        raw.altitude = body.altitude;
      }

      if (body.satellitesCount !== undefined) {
        raw.satellitesCount = body.satellitesCount;
      }

      if (body.hdop !== undefined) {
        raw.hdop = body.hdop;
      }

      if (body.rssi !== undefined) {
        raw.rssi = body.rssi;
      }

      if (body.snr !== undefined) {
        raw.snr = body.snr;
      }

      if (body.voltage !== undefined) {
        raw.voltage = body.voltage;
      }

      if (body.crc) {
        raw.crc = body.crc;
      }

      if (body.gatewayId) {
        raw.gatewayId = body.gatewayId;
      }

      const rawRfMessage = await rawRfMessageRepository.create(raw);

      return res.status(202) // 202 Accepted. The request has been received but not yet acted upon
        .json({
          rawRfMessage: rawRfMessage.id,
          status: rawRfMessage.invalidReasonId === 0 ? 'queued' : 'invalid',
          invalidReasonId: rawRfMessage.invalidReasonId,
        });
    } catch (err) {
      return next(err);
    }
  }

  return { get, post };
}

export default rawRfMessageController;
