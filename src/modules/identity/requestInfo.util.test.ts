import { describe, it, expect } from 'vitest';
import type { Request } from 'express';

import requestInfo from './requestInfo.util';

function request(ip: unknown, userAgent?: string) {
  return { ip, get: () => userAgent } as unknown as Request;
}

describe('requestInfo', () => {
  it('unwraps IPv4-mapped IPv6 addresses', () => {
    expect(requestInfo(request('::ffff:181.1.2.3')).ip).toBe('181.1.2.3');
  });

  it('keeps IPv6 addresses', () => {
    expect(requestInfo(request('2800:810::1')).ip).toBe('2800:810::1');
  });

  it('drops anything that is not an IP', () => {
    expect(requestInfo(request("1.2.3.4'; DROP TABLE users;--")).ip).toBeNull();
    expect(requestInfo(request(undefined)).ip).toBeNull();
  });

  it('removes control characters from the user agent and limits its length', () => {
    const { userAgent } = requestInfo(request('1.2.3.4', `Mozilla\n\u0000/5.0${'x'.repeat(600)}`));

    expect(userAgent).toMatch(/^Mozilla\/5\.0x+$/);
    expect(userAgent).toHaveLength(512);
  });

  it('returns null without a user agent', () => {
    expect(requestInfo(request('1.2.3.4')).userAgent).toBeNull();
  });
});
