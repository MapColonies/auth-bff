import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status-codes';
import { initConfig } from '@common/config';

// --- Mock helpers -----------------------------------------------------------

// Creates a minimal fake Request object
const mockRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    method: 'GET',
    params: {},
    ...overrides,
  }) as unknown as Request;

// Creates a fake Response with chainable status/json spies
const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

// ----------------------------------------------------------------------------

// Import middleware AFTER vi.mock so the mocked getConfig is in place
// for the toggle tests that need opa.enabled: false
describe('OPA Middleware', () => {
  beforeAll(async () => {
    await initConfig(true);
  });

  // ── opaEnabledMiddleware ────────────────────────────────────────────────
  describe('opaEnabledMiddleware', () => {
    describe('Happy Path', () => {
      it('should call next() when opa is enabled', async () => {
        // Re-import after config is set to enabled (default.json has enabled: true)
        const { opaEnabledMiddleware } = await import('@src/opa/middleware/opaMiddleware');
        const req = mockRequest();
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        opaEnabledMiddleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('Sad Path', () => {
      it('should return 503 when opa is disabled', async () => {
        // Override getConfig to simulate opa.enabled: false
        vi.mock('@common/config', async (importOriginal) => {
          const original = await importOriginal<typeof import('@common/config')>();
          return {
            ...original,
            getConfig: vi.fn().mockReturnValue({
              get: vi.fn((key: string) => {
                if (key === 'opa.enabled') return false;
                return original.getConfig().get(key as never);
              }),
            }),
          };
        });

        const { opaEnabledMiddleware } = await import('@src/opa/middleware/opaMiddleware');
        const req = mockRequest();
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        opaEnabledMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(httpStatus.SERVICE_UNAVAILABLE);
        expect(res.json).toHaveBeenCalledWith({ message: 'OPA capabilities are disabled on this node' });
        expect(next).not.toHaveBeenCalled();

        vi.restoreAllMocks();
      });
    });
  });

  // ── opaMethodFilterMiddleware ───────────────────────────────────────────
  describe('opaMethodFilterMiddleware', () => {
    let opaMethodFilterMiddleware: (req: Request, res: Response, next: NextFunction) => void;

    beforeEach(async () => {
      const mod = await import('@src/opa/middleware/opaMiddleware');
      opaMethodFilterMiddleware = mod.opaMethodFilterMiddleware;
    });

    describe('Happy Path', () => {
      it('should call next() for GET requests', () => {
        const req = mockRequest({ method: 'GET' });
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        opaMethodFilterMiddleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should call next() for POST requests', () => {
        const req = mockRequest({ method: 'POST' });
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        opaMethodFilterMiddleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('Bad Path', () => {
      it.each(['DELETE', 'PUT', 'PATCH'])('should return 405 for %s requests', (method) => {
        const req = mockRequest({ method });
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        opaMethodFilterMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(httpStatus.METHOD_NOT_ALLOWED);
        expect(res.json).toHaveBeenCalledWith({
          message: `Method ${method} is not allowed on OPA evaluate endpoints`,
        });
        expect(next).not.toHaveBeenCalled();
      });
    });
  });

  // ── opaEnvironmentMiddleware ────────────────────────────────────────────
  describe('opaEnvironmentMiddleware', () => {
    let opaEnvironmentMiddleware: (req: Request, res: Response, next: NextFunction) => void;

    beforeEach(async () => {
      const mod = await import('@src/opa/middleware/opaMiddleware');
      opaEnvironmentMiddleware = mod.opaEnvironmentMiddleware;
    });

    describe('Happy Path', () => {
      it('should call next() for a valid environment', () => {
        // 'prod' exists in config/default.json opa.servers
        const req = mockRequest({ params: { environment: 'prod' } as Record<string, string> });
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        opaEnvironmentMiddleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('Bad Path', () => {
      it('should return 400 when environment param is empty', () => {
        const req = mockRequest({ params: { environment: '' } as Record<string, string> });
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        opaEnvironmentMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
        expect(res.json).toHaveBeenCalledWith({ message: 'Missing environment parameter' });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 404 for an unknown environment', () => {
        const req = mockRequest({ params: { environment: 'nonexistent' } as Record<string, string> });
        const res = mockResponse();
        const next: NextFunction = vi.fn();

        opaEnvironmentMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(httpStatus.NOT_FOUND);
        expect(res.json).toHaveBeenCalledWith({
          message: `OPA environment 'nonexistent' not found`,
        });
        expect(next).not.toHaveBeenCalled();
      });
    });
  });
});
