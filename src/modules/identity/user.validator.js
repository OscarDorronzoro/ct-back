import { z } from 'zod';

import ROLES from './roles.constants';
import { idParams, nonEmptyString } from '../../shared/validation/common';

// At least one role, duplicates removed
const roles = z.array(z.enum(Object.values(ROLES)))
  .min(1, 'at least one role is required')
  .transform((list) => [...new Set(list)]);

export const userParams = idParams('userId');

export const userSessionParams = userParams.extend({
  sessionId: z.uuid(),
});

export const createUserBody = z.object({
  username: nonEmptyString,
  password: nonEmptyString,
  roles: roles.default([ROLES.VIEWER]),
});

// Only the password and the roles can change
export const updateUserBody = z.object({
  password: nonEmptyString.optional(),
  roles: roles.optional(),
});
