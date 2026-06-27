import { fn, col } from 'sequelize';
import sequelize from '../sequelize';

import RawRfMessage from '../models/RawRfMessageModel';
import Position from '../models/PositionModel';
import logger from '../utils/logger';
import haversine from '../utils/positionHelper';

function normalizeRssi(rssi) {
  if (!rssi) return null;

  const min = -140;
  const max = -70;

  const value = ((rssi - min) / (max - min)) * 100;

  return Math.max(0, Math.min(100, value));
}

function normalizeSnr(snr) {
  if (!snr) return null;

  const min = -17;
  const max = 6;

  const value = ((snr - min) / (max - min)) * 100;

  return Math.max(0, Math.min(100, value));
}

function computeSignalStrength(rssi, snr) {
  const rssiScore = normalizeRssi(rssi);
  const snrScore = normalizeSnr(snr);

  if (!rssiScore && !snrScore) return null;

  let rssiWeight = 0.1;
  let snrWeight = 0.9;

  if (!snrScore) {
    rssiWeight = 1;
    snrWeight = 0;
  }

  if (!rssi) {
    snrWeight = 1;
    rssiWeight = 0;
  }

  return Math.round(rssiScore * rssiWeight + snrScore * snrWeight);
}

async function processPendingMessages() {
  logger.debug('processPendingMessages start');

  // Get batch to process
  const raws = await RawRfMessage.findAll({
    where: {
      processedAt: null,
      // invalidReasonId: 0,
    },
    limit: 1000,
    order: [['id', 'ASC']],
  });

  logger.debug(`Found ${raws.length} pending raws`);

  // Get collars to process
  const collarIds = [...new Set(raws.map((r) => r.collarId))];

  // Get last positions by collar
  const latestIdByCollars = await Position.findAll({
    attributes: [
      'collarId',
      [fn('MAX', col('id')), 'maxId'],
    ],
    where: { collarId: collarIds },
    group: ['collarId'],
    raw: true,
  });

  const lastestIds = latestIdByCollars.map((x) => x.maxId);

  const positions = await Position.findAll({
    where: {
      id: lastestIds,
    },
  });

  const previousPositions = Object.fromEntries(
    positions.map((p) => [p.collarId, p]),
  );

  // Process
  const t = await sequelize.transaction();
  try {
    /* eslint-disable no-await-in-loop */
    // eslint-disable-next-line no-restricted-syntax
    for (const raw of raws) {
      const position = {};

      position.latitude = raw.latitude;
      position.longitude = raw.longitude;
      position.recordedAt = raw.recordedAt;

      // accuracyMeters ≈ hdop × UERE (user equivalent range error)
      // UERE depends on the hardware
      const UERE = 5;
      if (raw.hdop) {
        position.accuracy = raw.hdop * UERE;
      }

      position.signalStrength = computeSignalStrength(raw.rssi, raw.snr);
      position.speed = raw.speed;

      position.rawRfMessageId = raw.id;
      position.collarId = raw.collarId;
      position.cowId = raw.collarId === 128 ? 6 : 7; // hardcoded cow

      let invalid = raw.invalidReasonId;

      // Only check valid positions, avoid first position (without prev)
      const prevPosition = previousPositions[position.collarId];
      if (invalid === 0 && prevPosition) {
        const distance = haversine(prevPosition, position);
        position.distanceToPrevious = distance;

        const timediff = new Date(position.recordedAt).getTime()
          - new Date(prevPosition.recordedAt).getTime();

        logger.debug(`Distance: ${distance}. TimeDiff: ${timediff}`);

        const IMPOSSIBLE_MOVEMENT = 6;

        if (timediff < 1000 * 60 * 3 && distance > 600) {
          invalid = IMPOSSIBLE_MOVEMENT + 5;
        }
        if (timediff < 1000 * 60 * 5 && distance > 800) {
          invalid = IMPOSSIBLE_MOVEMENT + 4;
        }
        if (timediff < 1000 * 60 * 15 && distance > 1100) {
          invalid = IMPOSSIBLE_MOVEMENT + 3;
        }
        if (timediff < 1000 * 60 * 40 && distance > 1700) {
          invalid = IMPOSSIBLE_MOVEMENT + 2;
        }
        if (timediff < 1000 * 60 * 60 && distance > 2400) {
          invalid = IMPOSSIBLE_MOVEMENT + 1;
        }
        if (timediff < 1000 * 60 * 60 * 24 * 7 && distance > 5000) {
          invalid = IMPOSSIBLE_MOVEMENT;
        }
      }

      if (invalid === 0) {
        await Position.create(position, { transaction: t });
        previousPositions[position.collarId] = position;
      }

      raw.invalidReasonId = invalid;
      raw.processedAt = new Date();
      await raw.save({ transaction: t });
    }

    await t.commit();
  } catch (err) {
    logger.error(err);

    if (!t.finished) {
      await t.rollback();
    }
  }
}

export default processPendingMessages;
