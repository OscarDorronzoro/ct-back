import { z } from 'zod';

import firmwareVersion from './firmwareVersion.util';
import { idParams, optionalField } from '../../shared/validation/common';

export const collarParams = idParams('collarId');

// Editable fields; empty ones are left as they are
export const collarBody = z.object({
  // LoRa id
  code: optionalField(z.coerce.number().int().min(1).max(255)),

  // 'AA:BB:CC:DD:EE:FF', 'aa-bb-...' or 'aabbcc...' -> 'aabbccddeeff'
  mac: optionalField(z.string()
    .transform((value) => value.toLowerCase().replace(/[:-]/g, ''))
    .pipe(z.string().regex(/^[0-9a-f]{12}$/, 'must have 12 hex digits'))),

  // 'v1.2' -> '1.2.0'
  firmwareVersion: optionalField(z.string()
    .transform((value) => firmwareVersion.normalize(value))
    .pipe(z.string('must be X.Y.Z'))),

  description: optionalField(z.string()),
});
