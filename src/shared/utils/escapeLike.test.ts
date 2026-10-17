import { describe, it, expect } from 'vitest';

import escapeLike from './escapeLike';

describe('escapeLike', () => {
  it('escapes LIKE wildcards and the escape character', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });

  it('leaves normal text unchanged', () => {
    expect(escapeLike('Ángela')).toBe('Ángela');
  });
});
