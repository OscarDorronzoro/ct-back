import { z } from 'zod';

import { idParams, firmwareVersionSchema } from '../../shared/validation/common';

export const firmwareParams = idParams('firmwareId');

// Gateway download: the LoRa code of the firmware
export const firmwareCodeParams = z.object({
  code: z.coerce.number().int().min(1).max(255),
});

// Multipart form; the .bin file is checked by firmwareService
export const createFirmwareBody = z.object({
  code: z.coerce.number().int().min(1).max(255),
  version: firmwareVersionSchema,
  notes: z.string().optional().transform((value) => value || null),
});
