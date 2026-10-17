import {
  describe, it, expect, vi,
} from 'vitest';
import multer from 'multer';

import errorHandler from './errorHandler.middleware';
import AppError from '../errors/AppError';
import { mockRequest, mockResponse } from '../testing/http';

function handle(err: unknown, res = mockResponse()) {
  const next = vi.fn();
  errorHandler(err, mockRequest(), res, next);
  return { res, next };
}

describe('errorHandler', () => {
  it('answers AppError with its status and code', () => {
    const { res } = handle(new AppError('COW_NOT_FOUND', 404));

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ error: 'COW_NOT_FOUND' });
  });

  it('includes the AppError detail when it has one', () => {
    const { res } = handle(new AppError('INVALID_ZONE', 400, 'edges must not cross'));

    expect(res.body).toEqual({ error: 'INVALID_ZONE', message: 'edges must not cross' });
  });

  it('answers 413 to a file over the size limit', () => {
    const { res } = handle(new multer.MulterError('LIMIT_FILE_SIZE'));

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.body).toMatchObject({ error: 'LIMIT_FILE_SIZE' });
  });

  it('keeps the 4xx status of Express errors (invalid JSON)', () => {
    const err = Object.assign(new Error('Unexpected end of JSON input'), { status: 400, expose: true });
    const { res } = handle(err);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ error: 'BAD_REQUEST', message: 'Unexpected end of JSON input' });
  });

  it('hides the message of errors not meant for the client', () => {
    const err = Object.assign(new Error('internal detail'), { status: 403, expose: false });

    expect(handle(err).res.body).toEqual({ error: 'FORBIDDEN' });
  });

  it('answers 500 to anything else, without details', () => {
    const { res } = handle(new Error('database is down'));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });

  it('delegates to Express when the response already started', () => {
    const res = mockResponse();
    res.headersSent = true;
    const err = new Error('stream failed');

    const { next } = handle(err, res);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});
