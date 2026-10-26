import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

import authenticateUser from './authenticateUser.middleware';

const SECRET = 'unit-test-secret';

// The request with the access cookie, and what the middleware answers
function run(token?: string) {
  const req = { cookies: token ? { auth_token: token } : {} } as unknown as Request;
  const res = { sendStatus: vi.fn() } as unknown as Response;
  const next = vi.fn() as NextFunction;

  authenticateUser(req, res, next);

  return { req, res, next };
}

describe('authenticateUser', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', SECRET);
  });

  it('lets a valid token through, with the permissions of its roles', () => {
    const { req, next } = run(jwt.sign({ sub: 4, roles: ['viewer'], sid: 'abc' }, SECRET));

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ sub: 4, roles: ['viewer'], sid: 'abc' });
    expect(req.user?.permissions).toContain('map:read');
    expect(req.user?.permissions).not.toContain('cows:write');
  });

  it.each([
    ['without a token', undefined],
    ['with a token signed by someone else', jwt.sign({ sub: 4, roles: ['admin'] }, 'another-secret')],
    ['with an expired token', jwt.sign({ sub: 4, roles: ['admin'], exp: Math.floor(Date.now() / 1000) - 60 }, SECRET)],
    ['with a token of before the roles (numeric role)', jwt.sign({ sub: 4, role: 0 }, SECRET)],
    ['with something that is not a token', 'not-a-jwt'],
  ])('answers 401 %s', (_, token) => {
    const { res, next } = run(token);

    expect(res.sendStatus).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
