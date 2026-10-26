import { FACTORY_PARAMS } from '../devices/collarParams.constants';
import {
  EVENT_TYPES, INVALID_REASONS, MESSAGE_TYPES, INTEGRITY,
} from './rf.constants';

// Pure rules of the messages of the gateway: what is stored on reception, the location check, the
// signal and the battery level. The processing (rawRfMessage.service) uses them.

// Recovery needs this margin over batteryLow, so readings around the threshold don't flap
const BATTERY_HYSTERESIS_MV = 100;

// Voltages outside this range are not battery readings (noise, legacy sleep with the GPS time)
const MIN_VOLTAGE = 2;
const MAX_VOLTAGE = 5;

// Fields stored in their own columns. Any other field sent by the gateway goes to `data`.
const COLUMN_FIELDS = [
  'collarId', 'latitude', 'longitude', 'recordedAt', 'type', 'integrity', 'raw', 'seq',
  'speed', 'altitude', 'satellitesCount', 'hdop', 'rssi', 'snr', 'voltage', 'crc',
];

export function hasPosition(type) {
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

export function computeSignalStrength(rssi, snr) {
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
export function checkLocation(latitude, longitude) {
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
export function batteryLevel(voltage, params, previous) {
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

// Row to store from the body sent by the gateway (already validated).
// Filler values of the gateway (latitude -1, hdop 1.0, voltage 0) are stored as null.
export function buildRawRfMessage(body, gatewayId) {
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
}
