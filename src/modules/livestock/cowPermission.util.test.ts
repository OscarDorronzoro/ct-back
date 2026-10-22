import { describe, it, expect } from 'vitest';

import missingCowPermission from './cowPermission.util';

describe('missingCowPermission', () => {
  it('needs cows:write for the cow data', () => {
    expect(missingCowPermission(['alias', 'categoryId'], ['cows:write'])).toBeNull();
    expect(missingCowPermission(['alias'], ['cows:assignCollar'])).toBe('cows:write');
  });

  it('needs cows:assignCollar for the collar', () => {
    expect(missingCowPermission(['currentCollarId'], ['cows:assignCollar'])).toBeNull();
    expect(missingCowPermission(['alias', 'currentCollarId'], ['cows:write'])).toBe('cows:assignCollar');
  });

  it('needs nothing when nothing changes', () => {
    expect(missingCowPermission([], [])).toBeNull();
  });
});
