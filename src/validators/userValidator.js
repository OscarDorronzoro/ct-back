import { z } from 'zod';

import ROLES from '../utils/roles';
import { idParams, nonEmptyString } from './common';

const role = z.coerce.number().int()
  .refine((value) => Object.values(ROLES).includes(value), 'invalid role');

export const userParams = idParams('userId');

export const userSessionParams = userParams.extend({
  sessionId: z.uuid(),
});

export const createUserBody = z.object({
  username: nonEmptyString,
  password: nonEmptyString,
  role: role.default(ROLES.VIEWER),
});

// Only the password and the role can change
export const updateUserBody = z.object({
  password: nonEmptyString.optional(),
  role: role.optional(),
});
