-- Reference data of v1.0.0: what a new database needs besides schema.sql (the dump is schema only).
-- New database: schema.sql, then this file, then deploy.sql (which adds the rows of later versions).

INSERT INTO event_types (id, name) OVERRIDING SYSTEM VALUE VALUES
  (1, 'diag'),
  (2, 'boot'),
  (3, 'sleep'),
  (4, 'wake'),
  (5, 'join'),
  (6, 'firmwareChanged'),
  (7, 'otaResult'),
  (8, 'batteryLow'),
  (9, 'batteryCritical'),
  (10, 'batteryRecovered'),
  (11, 'gpsFailure');

INSERT INTO zone_types (id, name) OVERRIDING SYSTEM VALUE VALUES
  (1, 'general'),
  (2, 'potrero'),
  (3, 'corral'),
  (4, 'tambo'),
  (5, 'aguada'),
  (6, 'exclusion');

INSERT INTO invalid_reasons (id, description) OVERRIDING SYSTEM VALUE VALUES
  (0, 'OK'),
  (1, 'Latitude or longitude out of range'),
  (2, 'Wrong location, although within valid range. Tx issue'),
  (3, 'GPS uninitialized, not getting fix'),
  (4, 'Invalidated by user'),
  (5, 'CRC check fails'),
  (6, 'Impossible movement'),
  (7, 'Impossible movement (> 2400 m in < 1 h)'),
  (8, 'Impossible movement (> 1700 m in < 40 min)'),
  (9, 'Impossible movement (> 1100 m in < 15 min)'),
  (10, 'Impossible movement (> 800 m in < 5 min)'),
  (11, 'Impossible movement (> 600 m in < 3 min)'),
  (20, 'Unknown collar'),
  (21, 'Corrupted frame, not repairable'),
  (22, 'Repeated position, no new GPS fix'),
  (23, 'Unknown message type');

-- The identity columns continue after the ids above
SELECT setval(pg_get_serial_sequence('event_types', 'id'), (SELECT max(id) FROM event_types));
SELECT setval(pg_get_serial_sequence('zone_types', 'id'), (SELECT max(id) FROM zone_types));
SELECT setval(pg_get_serial_sequence('invalid_reasons', 'id'), (SELECT max(id) FROM invalid_reasons));
