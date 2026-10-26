import { max, inArray } from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import positions from '../monitoring/position.schema';

import rawRfMessageRepository from './rawRfMessage.repository';
import positionRepository from '../monitoring/position.repository';
import zoneRepository from '../monitoring/zone.repository';
import collarRepository from '../devices/collar.repository';
import eventRepository from './event.repository';
import {
  zoneEvents, zoneStateOf, FIELD_EVENTS, EXCLUSION_EVENTS, INITIAL_ZONE_STATE,
} from './zoneEvents.util';
import firmwareRepository from '../devices/firmware.repository';

import logger from '../../shared/utils/logger';
import haversine, { bearing } from '../../shared/utils/positionHelper';
import {
  EVENT_TYPES, INVALID_REASONS, MESSAGE_TYPES,
} from './rf.constants';
import {
  buildRawRfMessage, hasPosition, computeSignalStrength, batteryLevel,
} from './rawRfMessage.util';

const KNOWN_TYPES = Object.values(MESSAGE_TYPES).filter((t) => t !== MESSAGE_TYPES.UNKNOWN);

// Speed and direction need some movement and some time to mean something: below this distance
// the animal is still (the rest is GPS noise), and below this interval (e.g. the sleep message
// right after a position) any noise becomes an absurd speed.
const MIN_MOVEMENT_M = 10;
const MIN_MOTION_INTERVAL_MS = 30 * 1000;
const SLEEP_EVENTS = [EVENT_TYPES.SLEEP, EVENT_TYPES.WAKE];
const BATTERY_EVENTS = [
  EVENT_TYPES.BATTERY_LOW,
  EVENT_TYPES.BATTERY_CRITICAL,
  EVENT_TYPES.BATTERY_RECOVERED,
];

// State needed to derive events, per collar id. Updated while the batch is processed, so a
// collar with several messages in the batch doesn't repeat events.
async function loadEventState(collarIds, cowIds, tx) {
  // One after another: a transaction is one connection
  const lastSleep = await eventRepository.findLastByCollars(collarIds, SLEEP_EVENTS, tx);
  const lastBattery = await eventRepository.findLastByCollars(collarIds, BATTERY_EVENTS, tx);
  const lastField = await eventRepository.findLastByCows(cowIds, FIELD_EVENTS, tx);
  const lastExclusion = await eventRepository.findLastByCows(cowIds, EXCLUSION_EVENTS, tx);

  const fieldByCow = new Map(lastField.map((e) => [e.cowId, e]));
  const exclusionByCow = new Map(lastExclusion.map((e) => [e.cowId, e]));

  return {
    sleep: new Map(lastSleep.map((e) => [e.collarId, e.eventTypeId])),
    battery: new Map(lastBattery.map((e) => [e.collarId, e.eventTypeId])),
    // Firmware code reported in this batch; before that, the one stored in the collar
    firmware: new Map(),
    // Zone state of each cow (zoneEvents.util)
    zone: new Map(cowIds.map((id) => [
      id,
      zoneStateOf(fieldByCow.get(id), exclusionByCow.get(id)),
    ])),
    // Zone status of the last position of each collar in this batch (the "previous" of the next)
    zoneStatus: new Map(),
  };
}

// Zone events of the cow after a stored position (left the field, entered an exclusion zone...).
// status: where the position is (zoneRepository.findStatus); prevPosition: the one before it.
async function processZoneEvents(position, status, prevPosition, state, tx) {
  const { collarId, cowId } = position;
  const lastStatus = state.zoneStatus.get(collarId);
  state.zoneStatus.set(collarId, status);

  // Two positions in a row of the same cow (not the first one, nor one from another cow)
  if (!cowId || !prevPosition || prevPosition.cowId !== cowId) {
    return;
  }

  const previous = lastStatus ?? await zoneRepository.findStatus(prevPosition.location, tx);
  const { events: found, state: next } = zoneEvents(
    state.zone.get(cowId) ?? INITIAL_ZONE_STATE,
    status,
    previous,
  );
  state.zone.set(cowId, next);

  await eventRepository.createMany(found.map((event) => ({
    ...event,
    cowId,
    collarId,
    positionId: position.id,
    rawRfMessageId: position.rawRfMessageId,
    occurredAt: position.recordedAt,
  })), tx);
}

// The collar reports its firmware (boot, ota): keep collars.firmwareCode/firmwareVersion in sync
async function syncFirmware(collar, fw, state, tx) {
  const current = state.firmware.get(collar.id) ?? collar.firmwareCode;

  if (!Number.isInteger(fw) || fw <= 0 || fw === current) {
    return null;
  }

  const firmware = await firmwareRepository.findByCode(fw, tx);
  const version = firmware?.version ?? null;

  await collarRepository.update(collar.id, {
    firmwareCode: fw,
    firmwareVersion: version,
    updatedAt: new Date(),
  }, tx);

  state.firmware.set(collar.id, fw);

  return {
    eventTypeId: EVENT_TYPES.FIRMWARE_CHANGED,
    metadata: { from: current, to: fw, version },
  };
}

// Events derived from a message of a known collar
async function processEvents(raw, collar, state, tx) {
  const data = raw.data ?? {};
  const found = [];

  // Any message after a sleep means the collar woke up
  if (raw.type !== MESSAGE_TYPES.SLEEP && state.sleep.get(collar.id) === EVENT_TYPES.SLEEP) {
    found.push({ eventTypeId: EVENT_TYPES.WAKE });
    state.sleep.set(collar.id, EVENT_TYPES.WAKE);
  }

  switch (raw.type) {
    case MESSAGE_TYPES.SLEEP:
      found.push({ eventTypeId: EVENT_TYPES.SLEEP, metadata: { sleepMin: data.sleepMin } });
      state.sleep.set(collar.id, EVENT_TYPES.SLEEP);
      break;

    case MESSAGE_TYPES.BOOT:
      found.push({
        eventTypeId: EVENT_TYPES.BOOT,
        metadata: { resetReason: data.resetReason, fw: data.fw },
      });
      found.push(await syncFirmware(collar, data.fw, state, tx));
      break;

    case MESSAGE_TYPES.DIAG:
      found.push({ eventTypeId: EVENT_TYPES.DIAG, metadata: data });

      if (data.gpsLink) {
        found.push({
          eventTypeId: EVENT_TYPES.GPS_FAILURE,
          metadata: { gpsLink: data.gpsLink, gpsChars: data.gpsChars },
        });
      }
      break;

    case MESSAGE_TYPES.OTA:
      found.push({ eventTypeId: EVENT_TYPES.OTA_RESULT, metadata: data });
      found.push(await syncFirmware(collar, data.fw, state, tx));
      break;

    case MESSAGE_TYPES.JOIN:
      found.push({ eventTypeId: EVENT_TYPES.JOIN, metadata: { mac: data.mac, code: collar.code } });
      break;

    default:
      break;
  }

  if (raw.voltage != null) {
    const previous = state.battery.get(collar.id) ?? EVENT_TYPES.BATTERY_RECOVERED;
    const level = batteryLevel(raw.voltage, collar.params, previous);

    if (level !== previous) {
      found.push({ eventTypeId: level, metadata: { voltage: raw.voltage } });
      state.battery.set(collar.id, level);
    }
  }

  await eventRepository.createMany(found.filter(Boolean).map((event) => ({
    ...event,
    collarId: collar.id,
    cowId: raw.cowId ?? null,
    rawRfMessageId: raw.id,
    occurredAt: raw.recordedAt,
  })), tx);
}

const rawRfMessageService = {

  // Row to store from the body sent by the gateway (rawRfMessage.util)
  buildRawRfMessage,

  async processPendingMessages() {
  // logger.debug('processPendingMessages start');

    // Get batch to process
    let start = Date.now();

    const raws = await rawRfMessageRepository.findPendingForProcessing(1000);

    logger.debug(`Found ${raws.length} pending raws in ${Date.now() - start} ms`);

    if (raws.length === 0) {
      return;
    }

    // join messages have no code: resolve the collar by mac (created on reception)
    const joinRaws = raws.filter((r) => r.type === MESSAGE_TYPES.JOIN && r.data?.mac);
    const macs = [...new Set(joinRaws.map((r) => r.data.mac))];
    const joinedCollars = await collarRepository.findByMacs(macs);
    const collarsByMac = new Map(joinedCollars.map((c) => [c.mac, c]));

    // Get collars to process
    const collarIds = [...new Set([
      ...raws.map((r) => r.collarId),
      ...[...collarsByMac.values()].map((c) => c.id),
    ].filter(Boolean))];

    const collarList = await collarRepository.findByIds(collarIds);
    const collarsById = new Map(collarList.map((c) => [c.id, c]));

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
    try {
      await db.transaction(async (tx) => {
        const processedAt = new Date();
        const cowIds = [...new Set(raws.map((r) => r.cowId).filter(Boolean))];
        const eventState = await loadEventState(collarIds, cowIds, tx);
        let insertTime = 0;
        let updateTime = 0;

        /* eslint-disable no-await-in-loop */
        // eslint-disable-next-line no-restricted-syntax
        for (const raw of raws) {
          let invalid = raw.invalidReasonId ?? INVALID_REASONS.OK;

          const collar = raw.type === MESSAGE_TYPES.JOIN
            ? collarsByMac.get(raw.data?.mac)
            : collarsById.get(raw.collarId);

          if (invalid === INVALID_REASONS.CORRUPTED_FRAME) {
            // Nothing decoded: kept only for signal analysis
          } else if (raw.type && !KNOWN_TYPES.includes(raw.type)) {
            invalid = INVALID_REASONS.UNKNOWN_TYPE;
          } else if (!collar) {
            invalid = INVALID_REASONS.UNKNOWN_COLLAR;
          } else {
            const t1 = Date.now();
            await processEvents(raw, collar, eventState, tx);
            insertTime += Date.now() - t1;

            if (hasPosition(raw.type) && raw.data?.fresh === false
              && invalid === INVALID_REASONS.OK) {
              invalid = INVALID_REASONS.REPEATED_POSITION;
            }
          }

          if (invalid === INVALID_REASONS.OK && collar && hasPosition(raw.type)) {
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

            position.rawRfMessageId = raw.id;
            position.collarId = collar.id;
            position.cowId = raw.cowId;

            // Only check valid positions, avoid first position (without prev)
            const prevPosition = previousPositions[position.collarId];
            if (prevPosition) {
              const distance = haversine(prevPosition, position);
              position.distanceToPrevious = distance;

              const timediff = new Date(position.recordedAt).getTime()
              - new Date(prevPosition.recordedAt).getTime();

              // Average speed (km/h) and direction since the previous position
              if (timediff >= MIN_MOTION_INTERVAL_MS) {
                if (distance < MIN_MOVEMENT_M) {
                  position.speed = 0;
                } else {
                  position.speed = (distance / (timediff / 1000)) * 3.6;
                  position.heading = bearing(prevPosition, position);
                }
              }

              const { IMPOSSIBLE_MOVEMENT } = INVALID_REASONS;

              // Same fix received twice
              if (timediff === 0) {
                invalid = INVALID_REASONS.REPEATED_POSITION;
              }

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

            if (invalid === INVALID_REASONS.OK) {
              const t1 = Date.now();
              // Zones as they are when the position arrives: later changes don't rewrite history
              const zoneStatus = await zoneRepository.findStatus(position.location, tx);
              position.zoneId = zoneStatus.zoneId;
              const created = await positionRepository.create(position, tx);
              await processZoneEvents(created, zoneStatus, prevPosition, eventState, tx);
              insertTime += Date.now() - t1;
              previousPositions[position.collarId] = position;
            }
          }

          const t1 = Date.now();
          await rawRfMessageRepository.update({
            id: raw.id,
            invalidReasonId: invalid,
            processedAt,
          }, tx);
          updateTime += Date.now() - t1;
        }
        /* eslint-enable no-await-in-loop */

        logger.debug(`Insert time: ${insertTime} ms`);
        logger.debug(`Update time: ${updateTime} ms`);
      });
    } catch (err) {
      logger.error(err);
    }

    logger.debug(`Processing loop: ${Date.now() - start} ms`);
  },
};

export default rawRfMessageService;
