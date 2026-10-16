import rawRfMessageRepository from '../repositories/rawRfMessageRepository';
import collarRepository from '../repositories/collarRepository';
import rawRfMessageService from '../services/rawRfMessageService';
import collarService from '../services/collarService';
import commandService from '../services/commandService';
import firmwareService, { FIRMWARE_DIR } from '../services/firmwareService';

import logger from '../utils/logger';
import { INTEGRITY, MESSAGE_TYPES } from '../utils/rfConstants';

const MAC_REGEX = /^[0-9a-f]{12}$/;

function rawRfMessageController() {
  async function get(req, res, next) {
    try {
      const { dateFrom, dateTo } = req.validated.query;

      const rawRfMessages = await rawRfMessageRepository.findAll({
        where: {
          recordedAt: {
            lt: dateTo,
            gte: dateFrom,
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
      const raw = rawRfMessageService.buildRawRfMessage(req.validated.body, req.gateway.id);

      const rawRfMessage = await rawRfMessageRepository.create(raw);

      // Downlink: commands for the collar that just transmitted. Collars with old firmware
      // (legacy, or gateway without message types) don't receive commands.
      let downlink = { commands: [], cancel: [] };

      try {
        let collar = null;
        let onlyType;

        const canReceive = raw.type
          && (raw.integrity === INTEGRITY.OK || raw.integrity === INTEGRITY.REPAIRED);
        const mac = raw.data?.mac;

        if (canReceive && raw.type === MESSAGE_TYPES.JOIN && MAC_REGEX.test(mac)) {
          collar = await collarService.join(mac);
          onlyType = 'assignCode';
        } else if (canReceive && raw.collarCode) {
          collar = await collarRepository.findByCode(raw.collarCode);
        }

        downlink = await commandService.getForGateway(collar, req.gateway.id, { type: onlyType });
      } catch (err) {
        // The message is already stored: commands will be delivered on the next one
        logger.error({
          message: 'Failed to get commands for the gateway',
          rawRfMessage: rawRfMessage.id,
          error: err,
        });
      }

      return res.status(202) // 202 Accepted. The request has been received but not yet acted upon
        .json({
          rawRfMessage: rawRfMessage.id,
          status: rawRfMessage.invalidReasonId === 0 ? 'queued' : 'invalid',
          invalidReasonId: rawRfMessage.invalidReasonId,
          commands: downlink.commands,
          cancel: downlink.cancel,
        });
    } catch (err) {
      return next(err);
    }
  }

  // Results of the commands handed to the gateway: { results: [{ id, result }] }
  async function postResults(req, res, next) {
    try {
      const result = await commandService.reportResults(req.validated.body.results);

      return res.status(200)
        .json(result);
    } catch (err) {
      return next(err);
    }
  }

  // Firmware binary for the gateway, which serves it to the collars over WiFi
  async function getFirmware(req, res, next) {
    try {
      const { code } = req.validated.params;

      const firmware = await firmwareService.getFile(code);

      if (!firmware) {
        return res.status(404)
          .json({ error: 'Firmware not found' });
      }

      res.set({
        'Content-Type': 'application/octet-stream',
        'X-Firmware-Code': firmware.code,
        'X-Firmware-Version': firmware.version,
        'X-Firmware-MD5': firmware.md5,
        'X-Firmware-SHA256': firmware.sha256,
      });

      // root: Express resolves the name inside the folder and rejects anything outside it
      return res.sendFile(firmware.filename, { root: FIRMWARE_DIR });
    } catch (err) {
      return next(err);
    }
  }

  return {
    get, post, postResults, getFirmware,
  };
}

export default rawRfMessageController;
