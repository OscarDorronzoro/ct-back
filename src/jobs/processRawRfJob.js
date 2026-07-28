import { max, inArray } from 'drizzle-orm';

import db from '../db/drizzle';
import positions from '../schema/positions';

import rawRfMessageRepository from '../repositories/rawRfMessageRepository';
import positionRepository from '../repositories/positionRepository';

import logger from '../utils/logger';
import haversine from '../utils/positionHelper';

function normalizeRssi(rssi) {
  if (rssi == null) return null;

  const minVal = -140;
  const maxVal = -70;

  const value = ((rssi - minVal) / (maxVal - minVal)) * 100;

  return Math.max(0, Math.min(100, value));
}

function normalizeSnr(snr) {
  if (snr == null) return null;

  const minVal = -17;
  const maxVal = 6;

  const value = ((snr - minVal) / (maxVal - minVal)) * 100;

  return Math.max(0, Math.min(100, value));
}

function computeSignalStrength(rssi, snr) {
  const rssiScore = normalizeRssi(rssi);
  const snrScore = normalizeSnr(snr);

  if (rssiScore == null && snrScore == null) return null;

  let rssiWeight = 0.1;
  let snrWeight = 0.9;

  if (snrScore == null) {
    rssiWeight = 1;
    snrWeight = 0;
  }

  if (rssiScore == null) {
    snrWeight = 1;
    rssiWeight = 0;
  }

  return Math.round(rssiScore * rssiWeight + snrScore * snrWeight);
}

async function processPendingMessages() {
  // logger.debug('processPendingMessages start');

  // Get batch to process
  let start = Date.now();
  const raws = await rawRfMessageRepository.findAll({
    where: {
      processedAt: {
        isNull: true,
      },
    },
    limit: 1000,
    orderBy: [
      {
        field: 'id',
        direction: 'asc',
      },
    ],
  });

  /*
  const raws = await RawRfMessage.findAll({
    where: {
      processedAt: null,
      // invalidReasonId: 0,
    },
    limit: 1000,
    order: [['id', 'ASC']],
  }); */

  logger.debug(`Found ${raws.length} pending raws in ${Date.now() - start} ms`);

  if (raws.length === 0) {
    return;
  }

  // Get collars to process
  const collarIds = [...new Set(raws.map((r) => r.collarId))];

  // Get last positions by collar
  start = Date.now();

  const latestIdByCollars = await db
    .select({
      collarId: positions.collarId,
      maxId: max(positions.id),
    })
    .from(positions)
    .where(inArray(positions.collarId, collarIds))
    .groupBy(positions.collarId);

  logger.debug(`lastestIdByCollars: ${Date.now() - start} ms`);

  /* const latestIdByCollars = await Position.findAll({
    attributes: [
      'collarId',
      [fn('MAX', col('id')), 'maxId'],
    ],
    where: { collarId: collarIds },
    group: ['collarId'],
    raw: true,
  }); */

  const lastestIds = latestIdByCollars.map((x) => x.maxId);

  start = Date.now();

  const positionList = await positionRepository.findAll({
    where: {
      id: {
        in: lastestIds,
      },
    },
  });

  logger.debug(`positionList: ${Date.now() - start} ms`);

  const previousPositions = Object.fromEntries(
    positionList.map((p) => [p.collarId, p]),
  );

  // Process
  start = Date.now();
  // const t = await sequelize.transaction();
  try {
    await db.transaction(async (tx) => {
      const processedAt = new Date();
      // const rawsToUpdate = [];
      // const positionsToInsert = [];
      let insertTime = 0;
      let updateTime = 0;

      /* eslint-disable no-await-in-loop */
      // eslint-disable-next-line no-restricted-syntax
      for (const raw of raws) {
        const position = {};

        position.location = raw.location;
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

        let invalid = raw.invalidReasonId ?? 0;

        // Only check valid positions, avoid first position (without prev)
        const prevPosition = previousPositions[position.collarId];
        if (invalid === 0 && prevPosition) {
          const distance = haversine(prevPosition, position);
          position.distanceToPrevious = distance;

          const timediff = new Date(position.recordedAt).getTime()
            - new Date(prevPosition.recordedAt).getTime();

          // logger.debug(`Distance: ${distance}. TimeDiff: ${timediff}`);

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

        let t1;
        if (invalid === 0) {
          t1 = Date.now();
          await positionRepository.create(position, tx);
          insertTime += Date.now() - t1;
          // logger.debug(`Insert position: ${Date.now() - t1} ms`);
          // positionsToInsert.push(position);
          previousPositions[position.collarId] = position;
        }

        raw.invalidReasonId = invalid;
        raw.processedAt = processedAt;

        t1 = Date.now();
        await rawRfMessageRepository.update(raw, tx);
        updateTime += Date.now() - t1;
        // logger.debug(`Update raw: ${Date.now() - t1} ms`);

        /* rawsToUpdate.push({
          id: raw.id,
          invalidReasonId: raw.invalidReasonId,
          processedAt: raw.processedAt,
        }); */
      }

      // Batch update/insert after loop
      // await rawRfMessageRepository.updateBatch(rawsToUpdate, tx);
      // await positionRepository.createBatch(positionsToInsert, tx);
      logger.debug(`Insert time: ${insertTime} ms`);
      logger.debug(`Update time: ${updateTime} ms`);
    });
  } catch (err) {
    logger.error(err);
  }

  logger.debug(`Processing loop: ${Date.now() - start} ms`);
}

export default processPendingMessages;
