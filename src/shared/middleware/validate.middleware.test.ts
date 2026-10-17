import {
  describe, it, expect, vi,
} from 'vitest';
import { z } from 'zod';

import validate from './validate.middleware';
import { id, optionalField } from '../validation/common';
import { mockRequest, mockResponse } from '../testing/http';

const schemas = {
  params: z.object({ cowId: id }),
  body: z.object({ alias: z.string(), earTag: optionalField(z.string()) }),
};

describe('validate', () => {
  it('stores the parsed values in req.validated and calls next', () => {
    const req = mockRequest({ params: { cowId: '8' }, body: { alias: 'Ángela' } });
    const next = vi.fn();

    validate(schemas)(req, mockResponse(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.validated).toEqual({ params: { cowId: 8 }, body: { alias: 'Ángela' } });
  });

  it('drops optional fields sent empty', () => {
    const req = mockRequest({ params: { cowId: '8' }, body: { alias: 'x', earTag: '' } });

    validate(schemas)(req, mockResponse(), vi.fn());

    expect(Object.keys(req.validated.body ?? {})).toEqual(['alias']);
  });

  it('answers 400 with every failing field, from every part', () => {
    const res = mockResponse();
    const next = vi.fn();

    validate(schemas)(mockRequest({ params: { cowId: 'abc' }, body: {} }), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toMatchObject({
      error: 'VALIDATION_ERROR',
      issues: [
        { path: 'params.cowId' },
        { path: 'body.alias' },
      ],
    });
  });
});
