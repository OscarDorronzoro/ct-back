import { max, inArray } from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import positions from '../monitoring/position.schema';

import rawRfMessageRepository from './rawRfMessage.repository';
import positionRepository from '../monitoring/position.repository';
import collarRepository from '../devices/collar.repository';
import eventRepository from './event.repository';
import firmwareRepository from '../devices/firmware.repository';

import logger from '../../shared/utils/logger';
import haversine from '../../shared/utils/positionHelper';
import { FACTORY_PARAMS } from '../devices/collarParams.constants';
import {
  EVENT_TYPES, INVALID_REASONS, MESSAGE_TYPES, INTEGRITY,
} from './rf.constants';

const KNOWN_TYPES = Object.values(MESSAGE_TYPES).filter((t) => t !== MESSAGE_TYPES.UNKNOWN);

// Recovery needs this margin over batteryLow, so readings around the threshold don't flap
const BATTERY_HYSTERESIS_MV = 100;
// Voltages outside this range are not battery readings (noise, legacy sleep with the GPS time)
const MIN_VOLTAGE = 2;
const MAX_VOLTAGE = 5;

const SLEEP_EVENTS = [EVENT_TYPES.SLEEP, EVENT_TYPES.WAKE];
const BATTERY_EVENTS = [
  EVENT_TYPES.BATTERY_LOW,
  EVENT_TYPES.BATTERY_CRITICAL,
  EVENT_TYPES.BATTERY_RECOVERED,
];

// Fields stored in their own columns. Any other field sent by the gateway goes to `data`.
const COLUMN_FIELDS = [
  'collarId', 'latitude', 'longitude', 'recordedAt', 'type', 'integrity', 'raw', 'seq',
  'speed', 'altitude', 'satellitesCount', 'hdop', 'rssi', 'snr', 'voltage', 'crc',
];

function hasPosition(type) {
  return !type || type === MESSAGE_TYPES.POS || type === MESSAGE_TYPES.SLEEP;
}

function isPrimitive(value) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

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

// Location checks done on reception. Returns the invalid reason.
function checkLocation(latitude, longitude) {
  // The collar GPS has no valid fix.
  if (latitude === 0 && longitude === 0) {
    return INVALID_REASONS.GPS_UNINITIALIZED;
  }

  // No reliable position (the collar never had a fix), or invalid because of RF channel noise.
  // Keep the message because RSSI, SNR and other metadata may still
  // be useful for analyzing the transmission.
  if (latitude === -1 || longitude === -1) {
    return INVALID_REASONS.OUT_OF_RANGE;
  }

  // For now, use a hardcoded geographic range around the gateway.
  if (
    latitude > -32.8
    || latitude < -33
    || longitude > -61.1
    || longitude < -61.3
  ) {
    return INVALID_REASONS.WRONG_LOCATION;
  }

  return INVALID_REASONS.OK;
}

// Battery level after a reading: one of BATTERY_EVENTS
function batteryLevel(voltage, params, previous) {
  const mv = Math.round(voltage * 1000);
  const { batteryLow, batteryCritical } = { ...FACTORY_PARAMS, ...params };

  if (mv < batteryCritical) {
    return EVENT_TYPES.BATTERY_CRITICAL;
  }

  if (mv < batteryLow) {
    // Going up from critical to low is not an event
    return previous === EVENT_TYPES.BATTERY_CRITICAL
      ? EVENT_TYPES.BATTERY_CRITICAL
      : EVENT_TYPES.BATTERY_LOW;
  }

  if (mv >= batteryLow + BATTERY_HYSTERESIS_MV) {
    return EVENT_TYPES.BATTERY_RECOVERED;
  }

  return previous;
}

// State needed to derive events, per collar id. Updated while the batch is processed, so a
// collar with several messages in the batch doesn't repeat events.
async function loadEventState(collarIds, tx) {
  const [lastSleep, lastBattery] = await Promise.all([
    eventRepository.findLastByCollars(collarIds, SLEEP_EVENTS, tx),
    eventRepository.findLastByCollars(collarIds, BATTERY_EVENTS, tx),
  ]);

  return {
    sleep: new Map(lastSleep.map((e) => [e.collarId, e.eventTypeId])),
    battery: new Map(lastBattery.map((e) => [e.collarId, e.eventTypeId])),
    // Firmware code reported in this batch; before that, the one stored in the collar
    firmware: new Map(),
  };
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

  // Row to store from the body sent by the gateway (already validated).
  // Filler values of the gateway (latitude -1, hdop 1.0, voltage 0) are stored as null.
  buildRawRfMessage(body, gatewayId) {
    const {
      collarId, latitude, longitude, type, integrity, voltage, hdop,
    } = body;

    const data = Object.fromEntries(
      Object.entries(body)
        .filter(([key, value]) => !COLUMN_FIELDS.includes(key) && isPrimitive(value)),
    );

    if (typeof data.mac === 'string') {
      data.mac = data.mac.toLowerCase().replace(/[:-]/g, '');
    }

    const isBad = integrity === INTEGRITY.BAD;
    const isLegacy = integrity === INTEGRITY.LEGACY;

    let invalidReasonId = INVALID_REASONS.OK;
    let location = null;

    if (isBad) {
      invalidReasonId = INVALID_REASONS.CORRUPTED_FRAME;
    } else if (hasPosition(type)) {
      invalidReasonId = checkLocation(latitude, longitude);

      if (invalidReasonId === INVALID_REASONS.OK
        || invalidReasonId === INVALID_REASONS.WRONG_LOCATION) {
        location = { latitude, longitude };
      }
    }

    const validVoltage = !isBad
      && !(type === MESSAGE_TYPES.SLEEP && isLegacy)
      && voltage >= MIN_VOLTAGE
      && voltage <= MAX_VOLTAGE;

    return {
      collarCode: collarId > 0 ? collarId : null,
      type: type ?? null,
      integrity: integrity ?? null,
      raw: body.raw?.toLowerCase() ?? null,
      seq: body.seq ?? null,
      data: Object.keys(data).length > 0 ? data : null,
      recordedAt: body.recordedAt,
      location,
      speed: body.speed,
      altitude: body.altitude,
      satellitesCount: body.satellitesCount,
      // Only meaningful in positions
      hdop: (!type || type === MESSAGE_TYPES.POS) && !isBad && !isLegacy ? hdop : null,
      voltage: validVoltage ? voltage : null,
      rssi: body.rssi,
      snr: body.snr,
      crc: body.crc,
      invalidReasonId,
      gatewayId,
    };
  },

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
        const eventState = await loadEventState(collarIds, tx);
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
            position.speed = raw.speed;

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

              // logger.debug(`Distance: ${distance}. TimeDiff: ${timediff}`);

              const { IMPOSSIBLE_MOVEMENT } = INVALID_REASONS;

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
              await positionRepository.create(position, tx);
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
