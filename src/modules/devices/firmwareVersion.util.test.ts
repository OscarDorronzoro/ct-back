import { describe, it, expect } from 'vitest';

import firmwareVersion from './firmwareVersion.util';

describe('firmwareVersion.normalize', () => {
  it.each([
    ['1.2.3', '1.2.3'],
    ['v1.2', '1.2.0'],
    ['2', '2.0.0'],
    [' V01.002.3 ', '1.2.3'],
  ])('%j -> %j', (input, expected) => {
    expect(firmwareVersion.normalize(input)).toBe(expected);
  });

  it.each(['1.2.3.4', '1.x', '', 'abc'])('rejects %j', (input) => {
    expect(firmwareVersion.normalize(input)).toBeNull();
  });
});
