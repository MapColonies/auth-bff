import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '@common/middleware/asyncHandler';

describe('asyncHandler', () => {
  describe('#HappyPath', () => {
    it('should call the wrapped function with req, res, and next', function () {
      const fn = vi.fn().mockResolvedValue(undefined);
      const wrapped = asyncHandler(fn);

      const req = {} as Request;
      const res = {} as Response;
      const next: NextFunction = vi.fn();

      wrapped(req, res, next);

      expect(fn).toHaveBeenCalledWith(req, res, next);
    });

    it('should not call next() when the wrapped function resolves successfully', async function () {
      const fn = vi.fn().mockResolvedValue(undefined);
      const wrapped = asyncHandler(fn);

      const req = {} as Request;
      const res = {} as Response;
      const next: NextFunction = vi.fn();

      wrapped(req, res, next);

      await Promise.resolve();

      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('#SadPath', () => {
    it('should call next(err) when the wrapped function rejects', async function () {
      const testError = new Error('proxy exploded');
      const fn = vi.fn().mockRejectedValue(testError);
      const wrapped = asyncHandler(fn);

      const req = {} as Request;
      const res = {} as Response;
      const next: NextFunction = vi.fn();

      wrapped(req, res, next);

      await Promise.resolve();

      expect(next).toHaveBeenCalledWith(testError);
    });
  });
});
