import { z } from 'zod';

import {
  id, idParams, idList, optionalField, date,
} from './common';

export const cowParams = idParams('cowId');

// Multipart form (all values are strings). Empty fields are left as they are, except
// currentCollarId: empty (or 'null') means no collar.
export const cowBody = z.object({
  alias: optionalField(z.string()),
  earTag: optionalField(z.string()),
  breedId: optionalField(id),
  birthDate: optionalField(date),

  currentCollarId: z.preprocess(
    (value) => (value === '' || value === 'null' ? null : value),
    id.nullable(),
  ).optional(),

  groupIds: idList.optional(),

  // Remove the current image (a new image in the same request takes precedence)
  removeImage: z.enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});
