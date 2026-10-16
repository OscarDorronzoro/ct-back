import { z } from 'zod';

import { dateRangeQuery } from '../../shared/validation/common';

// Message sent by the gateway (POST /api/rf). Fields specific to each message type
// (ackCmd, gpsChars, mac, otaTarget, ...) are accepted as extra keys and stored in `data`.
const rawRfMessageValidator = z.looseObject({
  // 0 when the collar has no code yet (join) or the frame couldn't be decoded
  collarId: z.number().int().nonnegative(),

  latitude: z.number()
    .finite()
    .min(-90)
    .max(90),

  longitude: z.number()
    .finite()
    .min(-180)
    .max(180),

  // Without NTP the gateway doesn't send it: use the reception time
  recordedAt: z.iso.datetime()
    .transform((value) => new Date(value))
    .default(() => new Date()),

  // Missing in gateways before message types (position only)
  type: z.string().max(16).optional(),
  integrity: z.string().max(16).optional(),
  raw: z.string().regex(/^[0-9a-fA-F]*$/).max(128).optional(),
  seq: z.number().int().nonnegative().max(32767)
    .optional(),

  speed: z.number().finite().optional(),
  altitude: z.number().finite().optional(),
  satellitesCount: z.number().int().nonnegative().optional(),

  hdop: z.number().finite().nonnegative().optional(),
  rssi: z.number().finite().optional(),
  snr: z.number().finite().optional(),
  voltage: z.number().finite().optional(),

  crc: z.string().optional(),
});

export default rawRfMessageValidator;

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

// GET /api/rf. Default: the last 3 hours
export const rawRfMessageListQuery = dateRangeQuery(() => new Date(Date.now() - THREE_HOURS_MS));
