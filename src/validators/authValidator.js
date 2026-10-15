import { z } from 'zod';

import { nonEmptyString } from './common';

export const loginBody = z.object({
  username: nonEmptyString,
  password: nonEmptyString,
});

// Cookie, outside params/query/body: checked in the controller
export const refreshTokenCookie = nonEmptyString;
