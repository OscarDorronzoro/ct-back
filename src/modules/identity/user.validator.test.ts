import { describe, it, expect } from 'vitest';

import { createUserBody, updateUserBody } from './user.validator';

describe('createUserBody', () => {
  it('is a viewer when no roles are sent', () => {
    expect(createUserBody.parse({ username: 'ana', password: 'x' }).roles).toEqual(['viewer']);
  });

  it('accepts several roles, without duplicates', () => {
    const { roles } = createUserBody.parse({
      username: 'ana', password: 'x', roles: ['veterinarian', 'manager', 'veterinarian'],
    });

    expect(roles).toEqual(['veterinarian', 'manager']);
  });

  it('rejects unknown roles and an empty list', () => {
    expect(createUserBody.safeParse({ username: 'ana', password: 'x', roles: ['owner'] }).success).toBe(false);
    expect(createUserBody.safeParse({ username: 'ana', password: 'x', roles: [] }).success).toBe(false);
  });
});

describe('updateUserBody', () => {
  it('leaves the roles as they are when not sent', () => {
    expect(updateUserBody.parse({ password: 'nueva' })).toEqual({ password: 'nueva' });
  });
});
