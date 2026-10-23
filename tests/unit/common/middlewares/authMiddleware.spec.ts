import { describe, afterEach, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '@src/common/middlewares/authMiddleware';

const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('authMiddleware', () => {
  afterEach(function () {
    vi.clearAllMocks();
  });

  describe('#HappyPath', () => {
    it('should always call next()', function () {
      const req = {} as Request;
      const res = mockResponse();
      const next: NextFunction = vi.fn();

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
