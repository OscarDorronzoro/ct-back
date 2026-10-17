import { describe, it, expect } from 'vitest';

import { cowBody } from './cow.validator';

describe('cowBody', () => {
  it('leaves empty fields out (not sent: no change)', () => {
    expect(cowBody.parse({ alias: 'Ángela', earTag: '', breedId: '' })).toEqual({
      alias: 'Ángela',
      earTag: undefined,
      breedId: undefined,
    });
  });

  it.each(['', 'null'])('takes currentCollarId %j as "no collar"', (value) => {
    expect(cowBody.parse({ currentCollarId: value }).currentCollarId).toBeNull();
  });

  it('keeps currentCollarId undefined when not sent', () => {
    expect(cowBody.parse({}).currentCollarId).toBeUndefined();
  });

  it('rejects an invalid collar id', () => {
    expect(cowBody.safeParse({ currentCollarId: 'abc' }).success).toBe(false);
  });

  it('parses groupIds from a multipart form', () => {
    expect(cowBody.parse({ groupIds: ['2', '3', '2'] }).groupIds).toEqual([2, 3]);
    expect(cowBody.parse({ groupIds: '4' }).groupIds).toEqual([4]);
    expect(cowBody.parse({ groupIds: '' }).groupIds).toEqual([]);
  });

  it('turns removeImage into a boolean', () => {
    expect(cowBody.parse({ removeImage: 'true' }).removeImage).toBe(true);
    expect(cowBody.parse({ removeImage: 'false' }).removeImage).toBe(false);
    expect(cowBody.safeParse({ removeImage: 'yes' }).success).toBe(false);
  });

  it('parses the birth date', () => {
    expect(cowBody.parse({ birthDate: '2024-05-01' }).birthDate).toEqual(new Date('2024-05-01'));
    expect(cowBody.safeParse({ birthDate: 'nope' }).success).toBe(false);
  });
});
