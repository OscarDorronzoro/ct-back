import { z } from 'zod';

import { nonEmptyString } from '../../shared/validation/common';

const searchQuery = z.object({
  q: nonEmptyString,
});

export default searchQuery;
