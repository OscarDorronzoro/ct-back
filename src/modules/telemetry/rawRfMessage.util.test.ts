import { describe, it, expect } from 'vitest';

import {
  buildRawRfMessage, checkLocation, computeSignalStrength, batteryLevel,
} from './rawRfMessage.util';
import { EVENT_TYPES, INVALID_REASONS } from './rf.constants';

const recordedAt = new Date('2026-10-24T12:00:00Z');

// A position as the gateway sends it, inside the area of the farm
const position = {
  collarId: 12,
  type: 'pos',
  integrity: 'ok',
  latitude: -32.97,
  longitude: -61.21,
  recordedAt,
  hdop: 1.2,
  voltage: 3.9,
  rssi: -90,
  snr: 5,
};

describe('buildRawRfMessage', () => {
  it('stores a valid position with its location and its readings', () => {
    const row = buildRawRfMessage(position, 3);

    expect(row).toMatchObject({
      collarCode: 12,
      type: 'pos',
      location: { latitude: -32.97, longitude: -61.21 },
      recordedAt,
      hdop: 1.2,
      voltage: 3.9,
      invalidReasonId: INVALID_REASONS.OK,
      gatewayId: 3,
      data: null,
    });
  });

  it('turns the filler values of the gateway into null', () => {
    const row = buildRawRfMessage({
      ...position, collarId: 0, latitude: -1, longitude: -1, voltage: 0,
    }, 3);

    expect(row.collarCode).toBeNull();
    expect(row.location).toBeNull();
    expect(row.voltage).toBeNull();
    expect(row.invalidReasonId).toBe(INVALID_REASONS.OUT_OF_RANGE);
  });

  it('keeps the location of a fix outside the area, marked as wrong', () => {
    const row = buildRawRfMessage({ ...position, latitude: -33.5 }, 3);

    expect(row.invalidReasonId).toBe(INVALID_REASONS.WRONG_LOCATION);
    expect(row.location).toEqual({ latitude: -33.5, longitude: -61.21 });
  });

  it('trusts nothing of a corrupted frame', () => {
    const row = buildRawRfMessage({ ...position, integrity: 'bad' }, 3);

    expect(row.invalidReasonId).toBe(INVALID_REASONS.CORRUPTED_FRAME);
    expect(row.location).toBeNull();
    expect(row.voltage).toBeNull();
    expect(row.hdop).toBeNull();
  });

  it('ignores the voltage of a legacy sleep (it carried the GPS time) and the hdop out of positions', () => {
    const legacySleep = buildRawRfMessage({ ...position, type: 'sleep', integrity: 'legacy' }, 3);
    const diag = buildRawRfMessage({ ...position, type: 'diag' }, 3);

    expect(legacySleep.voltage).toBeNull();
    expect(legacySleep.hdop).toBeNull();
    expect(diag.hdop).toBeNull();
    expect(diag.voltage).toBe(3.9);
  });

  it('checks no location for messages without a position', () => {
    const boot = buildRawRfMessage({
      ...position, type: 'boot', latitude: 0, longitude: 0,
    }, 3);

    expect(boot.invalidReasonId).toBe(INVALID_REASONS.OK);
    expect(boot.location).toBeNull();
  });

  it('keeps the other simple fields in data, with the mac normalized', () => {
    const row = buildRawRfMessage({
      ...position, type: 'join', mac: 'AA:BB:CC:00:11:22', fw: 7, nested: { a: 1 },
    }, 3);

    expect(row.data).toEqual({ mac: 'aabbcc001122', fw: 7 });
  });

  it('stores the raw frame in lowercase', () => {
    expect(buildRawRfMessage({ ...position, raw: 'A1B2' }, 3).raw).toBe('a1b2');
  });
});

describe('checkLocation', () => {
  it.each([
    [0, 0, INVALID_REASONS.GPS_UNINITIALIZED],
    [-1, -61.2, INVALID_REASONS.OUT_OF_RANGE],
    [-32.97, -1, INVALID_REASONS.OUT_OF_RANGE],
    [-34.6, -58.4, INVALID_REASONS.WRONG_LOCATION],
    [-32.97, -61.21, INVALID_REASONS.OK],
  ])('%f, %f -> reason %i', (latitude, longitude, reason) => {
    expect(checkLocation(latitude, longitude)).toBe(reason);
  });
});

describe('computeSignalStrength', () => {
  it('is null without RSSI nor SNR', () => {
    expect(computeSignalStrength(null, null)).toBeNull();
  });

  it('weighs mostly the SNR (0-100), clamped to the useful range', () => {
    expect(computeSignalStrength(-70, 6)).toBe(100);
    expect(computeSignalStrength(-140, -17)).toBe(0);
    expect(computeSignalStrength(-30, 20)).toBe(100);
    // RSSI at 50 %, SNR at 0 %: 10 % of the weight is the RSSI
    expect(computeSignalStrength(-105, -17)).toBe(5);
  });

  it('uses the only one there is', () => {
    expect(computeSignalStrength(-105, null)).toBe(50);
    expect(computeSignalStrength(null, -5.5)).toBe(50);
  });
});

describe('batteryLevel', () => {
  const { BATTERY_LOW: LOW, BATTERY_CRITICAL: CRITICAL, BATTERY_RECOVERED: OK } = EVENT_TYPES;

  it('uses the factory thresholds: low under 3.55 V, critical under 3.45 V', () => {
    expect(batteryLevel(3.8, null, OK)).toBe(OK);
    expect(batteryLevel(3.54, null, OK)).toBe(LOW);
    expect(batteryLevel(3.44, null, LOW)).toBe(CRITICAL);
  });

  it('recovers only 100 mV above the low threshold', () => {
    expect(batteryLevel(3.6, null, LOW)).toBe(LOW);
    expect(batteryLevel(3.65, null, LOW)).toBe(OK);
  });

  it('does not go back from critical to low', () => {
    expect(batteryLevel(3.5, null, CRITICAL)).toBe(CRITICAL);
  });

  it("uses the collar's thresholds", () => {
    expect(batteryLevel(3.6, { batteryLow: 3700, batteryCritical: 3500 }, OK)).toBe(LOW);
  });
});
