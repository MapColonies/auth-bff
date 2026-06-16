import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import httpStatus from 'http-status-codes';
import type { Request, Response, NextFunction } from 'express';
import { opaEnabledMiddleware, opaMethodFilterMiddleware, opaEnvironmentMiddleware, authMiddleware } from '@src/opa/middleware/opaMiddleware';
import type { ConfigType } from '@common/config';
import { getConfig } from '@common/config';

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

const mockRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    method: 'GET',
    params: {},
    ...overrides,
  }) as unknown as Request;

describe('opaMiddleware', () => {
  beforeEach(function () {
    configMock = mockDeep<ConfigType>();
    vi.mocked(getConfig).mockReturnValue(configMock);
  });

  afterEach(function () {
    vi.clearAllMocks();
  });

  describe('#opaEnabledMiddleware', () => {
    describe('#HappyPath', () => {
      it('should call next() when opa.enabled is true', function () {
        configMock.get.mockReturnValue(true);

        const req = mockRequest();
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        opaEnabledMiddleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('#SadPath', () => {
      it('should respond with 503 when opa.enabled is false', function () {
        configMock.get.mockReturnValue(false);

        const req = mockRequest();
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        opaEnabledMiddleware(req, res, next);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(res.status).toHaveBeenCalledWith(httpStatus.SERVICE_UNAVAILABLE);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(res.json).toHaveBeenCalledWith({ message: 'OPA capabilities are disabled on this node' });
        expect(next).not.toHaveBeenCalled();
      });
    });
  });

  describe('#opaMethodFilterMiddleware', () => {
    describe('#HappyPath', () => {
      it('should call next() for GET requests', function () {
        const req = mockRequest({ method: 'GET' });
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        opaMethodFilterMiddleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should call next() for POST requests', function () {
        const req = mockRequest({ method: 'POST' });
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        opaMethodFilterMiddleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
      });
    });

    describe('#BadPath', () => {
      it.each(['DELETE', 'PUT', 'PATCH'])('should respond with 405 for %s requests', function (method) {
        const req = mockRequest({ method });
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        opaMethodFilterMiddleware(req, res, next);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(res.status).toHaveBeenCalledWith(httpStatus.METHOD_NOT_ALLOWED);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(res.json).toHaveBeenCalledWith({
          message: `Method ${method} is not allowed on OPA evaluate endpoints`,
        });
        expect(next).not.toHaveBeenCalled();
      });
    });
  });

  describe('#opaEnvironmentMiddleware', () => {
    describe('#HappyPath', () => {
      it('should call next() for a valid environment', function () {
        configMock.get.mockReturnValue({ prod: 'http://opa-prod:8181' });

        const req = mockRequest({ params: { environment: 'prod' } as Record<string, string> });
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        opaEnvironmentMiddleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('#BadPath', () => {
      it('should respond with 400 when environment param is empty', function () {
        const req = mockRequest({ params: { environment: '' } as Record<string, string> });
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        opaEnvironmentMiddleware(req, res, next);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(res.json).toHaveBeenCalledWith({ message: 'Missing environment parameter' });
        expect(next).not.toHaveBeenCalled();
      });

      it('should respond with 404 for an unknown environment', function () {
        configMock.get.mockReturnValue({ prod: 'http://opa-prod:8181' });

        const req = mockRequest({ params: { environment: 'nonexistent' } as Record<string, string> });
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        opaEnvironmentMiddleware(req, res, next);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(res.status).toHaveBeenCalledWith(httpStatus.NOT_FOUND);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(res.json).toHaveBeenCalledWith({ message: `OPA environment 'nonexistent' not found` });
        expect(next).not.toHaveBeenCalled();
      });
    });
  });

  describe('#authMiddleware', () => {
    describe('#HappyPath', () => {
      it('should always call next()', function () {
        const req = mockRequest();
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
