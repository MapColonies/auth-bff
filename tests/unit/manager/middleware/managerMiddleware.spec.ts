import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status-codes';
import { initConfig } from '@common/config';

const mockRequest = (): Request => ({}) as Request;

const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('Manager Middleware', () => {
  beforeAll(async () => {
    await initConfig(true);
  });

  // ── managerEnabledMiddleware ────────────────────────────────────────────
  describe('managerEnabledMiddleware', () => {
    describe('Happy Path', () => {
      it('should call next() when manager is enabled', async () => {
        const { managerEnabledMiddleware } = await import('@src/manager/middleware/managerMiddleware');
        const req = mockRequest();
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        managerEnabledMiddleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('Sad Path', () => {
      it('should return 503 when manager is disabled', async () => {
        vi.mock('@common/config', async (importOriginal) => {
          const original = await importOriginal<typeof import('@common/config')>();
          return {
            ...original,
            getConfig: vi.fn().mockReturnValue({
              get: vi.fn((key: string) => {
                if (key === 'manager.enabled') return false;
                return original.getConfig().get(key as never);
              }),
            }),
          };
        });

        const { managerEnabledMiddleware } = await import('@src/manager/middleware/managerMiddleware');
        const req = mockRequest();
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        managerEnabledMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(httpStatus.SERVICE_UNAVAILABLE);
        expect(res.json).toHaveBeenCalledWith({
          message: 'Auth Manager capabilities are disabled on this node',
        });
        expect(next).not.toHaveBeenCalled();

        vi.restoreAllMocks();
      });
    });
  });
});
