import { z } from 'zod';

import { idParams } from '../../shared/validation/common';

export const breedParams = idParams('breedId');

export const breedBody = z.object({
  name: z.string().trim().min(1, 'is required'),
});
