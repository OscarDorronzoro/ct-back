import { z } from 'zod';

import { idParams, optionalField } from '../../shared/validation/common';

export const groupParams = idParams('groupId');

// Empty fields are left as they are
export const groupBody = z.object({
  name: optionalField(z.string()),
  description: optionalField(z.string()),
});
