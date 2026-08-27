import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import httpStatus from 'http-status-codes';
import type { Request, Response, NextFunction } from 'express';
import type { ConfigType } from '@common/config';
import { createManagerEnabledMiddleware } from '@src/manager/middleware/managerMiddleware';
import { authMiddleware } from '@src/common/middlewares/authMiddleware';

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
  });

  afterEach(function () {
    vi.clearAllMocks();
  });

  describe('#createManagerEnabledMiddleware', () => {
    describe('#HappyPath', () => {
      it('should call next() when manager.enabled is true', function () {
        configMock.get.mockReturnValue(true);
        const middleware = createManagerEnabledMiddleware(configMock);

        const req = {} as Request;
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        middleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('#SadPath', () => {
      it('should respond with 503 when manager.enabled is false', function () {
        configMock.get.mockReturnValue(false);
        const middleware = createManagerEnabledMiddleware(configMock);

        const req = {} as Request;
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        middleware(req, res, next);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(res.status).toHaveBeenCalledWith(httpStatus.SERVICE_UNAVAILABLE);
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
