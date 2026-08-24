import rawRfMessageRepository from '../repositories/rawRfMessageRepository';
import rawRfMessageValidator from '../validators/rawRfMessageValidator';

import logger from '../utils/logger';

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
      const result = rawRfMessageValidator.safeParse(req.body);

      if (!result.success) {
        logger.debug({
          message: 'Invalid raw RF message payload',
          issues: result.error.issues,
        });

        return res.status(400)
          .json({ error: 'BAD_REQUEST' });
      }

      const body = result.data;

      // Check data validity
      let invalid = 0;

      // The collar GPS has no valid fix.
      if (body.latitude === 0 && body.longitude === 0) {
        invalid = 3;

      // GPS coordinates may be invalid because of RF channel noise.
      // Keep the message because RSSI, SNR and other metadata may still
      // be useful for analyzing the transmission.
      } else if (body.latitude === -1 || body.longitude === -1) {
        invalid = 1;

      // For now, use a hardcoded geographic range around the gateway.
      } else if (
        body.latitude > -32.8
        || body.latitude < -33
        || body.longitude > -61.1
        || body.longitude < -61.3
      ) {
        invalid = 2;
      }

      const raw = {
        ...body,
        location: {
          latitude: body.latitude,
          longitude: body.longitude,
        },
        invalidReasonId: invalid,
        gatewayId: req.gateway.id, // got via api key
      };

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
