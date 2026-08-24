import { z } from 'zod';

const rawRfMessageValidator = z.object({
  collarId: z.number().int().positive(),

  latitude: z.number()
    .finite()
    .min(-90)
    .max(90),

  longitude: z.number()
    .finite()
    .min(-180)
    .max(180),

  recordedAt: z.iso.datetime()
    .transform((value) => new Date(value))
    .default(() => new Date()),

  speed: z.number().finite().optional(),
  altitude: z.number().finite().optional(),
  satellitesCount: z.number().int().nonnegative().optional(),

  hdop: z.number().finite().nonnegative().optional(),
  rssi: z.number().finite().optional(),
  snr: z.number().finite().optional(),
  voltage: z.number()
    .finite().min(2).max(5)
    .optional(),

  crc: z.string().optional(),
});

export default rawRfMessageValidator;
