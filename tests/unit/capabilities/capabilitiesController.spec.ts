import { describe, beforeEach, afterEach, it, expect, vi, beforeAll } from 'vitest';
import { jsLogger, type Logger } from '@map-colonies/js-logger';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import httpStatus from 'http-status-codes';
import type { Response } from 'express';
import { CapabilitiesController } from '@src/capabilities/controllers/capabilitiesController';
import { type CapabilitiesManager } from '@src/capabilities/models/capabilitiesManager';

let capabilitiesController: CapabilitiesController;
let managerMock: DeepMockProxy<CapabilitiesManager>;

const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('CapabilitiesController', () => {
  let logger: Logger;

  beforeAll(async function () {
    logger = await jsLogger({ enabled: false });
  });

  beforeEach(function () {
    managerMock = mockDeep<CapabilitiesManager>();
    capabilitiesController = new CapabilitiesController(logger, managerMock);
  });

  afterEach(function () {
    vi.clearAllMocks();
  });

  describe('#getCapabilities', () => {
    describe('#HappyPath', () => {
      it('should respond with 200 and the manager result', function () {
        managerMock.getCapabilities.mockReturnValue({
          site: 'AZURE',
          environments: ['prod', 'qa'],
          features: { managerEnabled: true, opaEnabled: true },
        });

        const req = {} as unknown as Parameters<typeof capabilitiesController.getCapabilities>[0];
        const res = mockResponse();

        capabilitiesController.getCapabilities(req, res, vi.fn());

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(res.status).toHaveBeenCalledWith(httpStatus.OK);
        expect(res.json).toHaveBeenCalledWith({
          site: 'AZURE',
          environments: ['prod', 'qa'],
          features: { managerEnabled: true, opaEnabled: true },
        });
      });
    });

    describe('#SadPath', () => {
      it('should propagate an error thrown by the manager', function () {
        managerMock.getCapabilities.mockImplementation(() => {
          throw new Error('config not initialized');
        });

        const req = {} as unknown as Parameters<typeof capabilitiesController.getCapabilities>[0];
        const res = mockResponse();

        expect(() => capabilitiesController.getCapabilities(req, res, vi.fn())).toThrow('config not initialized');
      });
    });
  });
});
