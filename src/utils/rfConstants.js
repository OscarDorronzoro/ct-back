// Ids loaded by db_restore/to_prod.sql

export const EVENT_TYPES = {
  DIAG: 1,
  BOOT: 2,
  SLEEP: 3,
  WAKE: 4,
  JOIN: 5,
  FIRMWARE_CHANGED: 6,
  OTA_RESULT: 7,
  BATTERY_LOW: 8,
  BATTERY_CRITICAL: 9,
  BATTERY_RECOVERED: 10,
  GPS_FAILURE: 11,
};

export const INVALID_REASONS = {
  OK: 0,
  OUT_OF_RANGE: 1,
  WRONG_LOCATION: 2,
  GPS_UNINITIALIZED: 3,
  IMPOSSIBLE_MOVEMENT: 6, // 6..11, depending on time and distance
  UNKNOWN_COLLAR: 20,
  CORRUPTED_FRAME: 21,
  REPEATED_POSITION: 22,
  UNKNOWN_TYPE: 23,
};

// Message types decoded by the gateway. null = gateway firmware before message types (position)
export const MESSAGE_TYPES = {
  POS: 'pos',
  SLEEP: 'sleep',
  BOOT: 'boot',
  DIAG: 'diag',
  ACK: 'ack',
  JOIN: 'join',
  OTA: 'ota',
  UNKNOWN: 'unknown',
};

export const INTEGRITY = {
  OK: 'ok',
  REPAIRED: 'repaired',
  BAD: 'bad',
  LEGACY: 'legacy',
  NONE: 'none',
};

// Command types that can be requested from the API. assignCode is created by the system (join).
export const COMMAND_TYPES = [
  'params', 'resetParams', 'diag', 'reboot', 'zone', 'zoneClear', 'ota', 'otaCancel',
];

// Results reported by the gateway for each command target
export const COMMAND_RESULTS = ['ok', 'duplicate', 'badParams', 'unsupported', 'noAnswer', 'canceled'];

// Zone slots in the collar
export const ZONE_SLOTS = 4;
