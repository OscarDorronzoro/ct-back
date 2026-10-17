import { vi } from 'vitest';
import type { Request, Response } from 'express';

// Minimal Express req/res for middleware tests
export function mockRequest(values: Record<string, unknown> = {}) {
  return {
    method: 'GET', originalUrl: '/test', params: {}, query: {}, body: {}, ...values,
  } as unknown as Request;
}

export function mockResponse() {
  const res = { headersSent: false } as Response & { body?: unknown };

  res.status = vi.fn(() => res);
  res.json = vi.fn((body: unknown) => {
    res.body = body;
    return res;
  });

  return res;
}
