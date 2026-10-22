import {
  describe, it, expect, vi,
} from 'vitest';

import authorize, { authorizeAny } from './authorize.middleware';
import { mockRequest, mockResponse } from '../../shared/testing/http';

const withPermissions = (permissions: string[]) => mockRequest({ user: { permissions } });

describe('authorize', () => {
  it('calls next when the user has the permission', () => {
    const next = vi.fn();

    authorize('zones:write')(withPermissions(['map:read', 'zones:write']), mockResponse(), next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('answers 403 naming the missing permission', () => {
    const res = mockResponse();
    const next = vi.fn();

    authorize('zones:write')(withPermissions(['map:read']), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body).toEqual({ error: 'FORBIDDEN', message: 'Missing permission: zones:write' });
  });

  it('refuses an unknown permission when the route is defined', () => {
    expect(() => authorize('zone:write')).toThrow('Unknown permission');
  });
});

describe('authorizeAny', () => {
  it('calls next with any of the permissions', () => {
    const next = vi.fn();

    authorizeAny('cows:write', 'cows:assignCollar')(withPermissions(['cows:assignCollar']), mockResponse(), next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('answers 403 with none of them', () => {
    const res = mockResponse();

    authorizeAny('cows:write', 'cows:assignCollar')(withPermissions(['cows:read']), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
