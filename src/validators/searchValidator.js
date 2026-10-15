import { z } from 'zod';

import { nonEmptyString } from './common';

const searchQuery = z.object({
  q: nonEmptyString,
});

export default searchQuery;
