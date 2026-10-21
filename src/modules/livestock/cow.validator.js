import { z } from 'zod';

import {
  id, idParams, idList, optionalField, date,
} from '../../shared/validation/common';
import SEXES from './sex.constants';

export const cowParams = idParams('cowId');

// Empty or 'null': remove the value
const clearableId = z.preprocess(
  (value) => (value === '' || value === 'null' ? null : value),
  id.nullable(),
);

// Multipart form (all values are strings). Empty fields are left as they are, except
// currentCollarId and categoryId: empty (or 'null') means none.
export const cowBody = z.object({
  alias: optionalField(z.string()),
  earTag: optionalField(z.string()),
  breedId: optionalField(id),
  sex: optionalField(z.enum(Object.values(SEXES))),
  categoryId: clearableId.optional(),
  birthDate: optionalField(date),

  currentCollarId: clearableId.optional(),

  groupIds: idList.optional(),

  // Remove the current image (a new image in the same request takes precedence)
  removeImage: z.enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});
