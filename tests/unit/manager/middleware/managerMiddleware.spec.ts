import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import httpStatus from 'http-status-codes';
import type { Request, Response, NextFunction } from 'express';
import type { ConfigType } from '@common/config';
import { getConfig } from '@common/config';
import { managerEnabledMiddleware, authMiddleware } from '@src/manager/middleware/managerMiddleware';

vi.mock('@common/config', () => ({
  getConfig: vi.fn(),
}));

let configMock: DeepMockProxy<ConfigType>;

const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('managerMiddleware', () => {
  beforeEach(function () {
    configMock = mockDeep<ConfigType>();
    vi.mocked(getConfig).mockReturnValue(configMock);
  });

  afterEach(function () {
    vi.clearAllMocks();
  });

  describe('#managerEnabledMiddleware', () => {
    describe('#HappyPath', () => {
      it('should call next() when manager.enabled is true', function () {
        configMock.get.mockReturnValue(true);

        const req = {} as Request;
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        managerEnabledMiddleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('#SadPath', () => {
      it('should respond with 503 when manager.enabled is false', function () {
        configMock.get.mockReturnValue(false);

        const req = {} as Request;
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        managerEnabledMiddleware(req, res, next);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(res.status).toHaveBeenCalledWith(httpStatus.SERVICE_UNAVAILABLE);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(res.json).toHaveBeenCalledWith({
          message: 'Auth Manager capabilities are disabled on this node',
        });
        expect(next).not.toHaveBeenCalled();
      });
    });
  });

  describe('#authMiddleware', () => {
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
});
