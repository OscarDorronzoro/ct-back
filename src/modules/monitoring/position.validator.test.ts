import { describe, it, expect } from 'vitest';

import { latestPositionsQuery } from './position.validator';

describe('latestPositionsQuery', () => {
  it('shows the last 72 hours by default, and up to 30 days', () => {
    expect(latestPositionsQuery.parse({}).maxAgeHours).toBe(72);
    expect(latestPositionsQuery.parse({ maxAgeHours: '720' }).maxAgeHours).toBe(720);
  });

  it('rejects less than an hour, more than 30 days or fractions', () => {
    ['0', '721', '1.5'].forEach((maxAgeHours) => {
      expect(latestPositionsQuery.safeParse({ maxAgeHours }).success).toBe(false);
    });
  });
});
