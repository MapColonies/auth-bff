import { describe, beforeEach, afterEach, it, expect, vi, beforeAll } from 'vitest';
import { jsLogger, type Logger } from '@map-colonies/js-logger';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import type { ConfigType } from '@common/config';
import { CapabilitiesManager } from '@src/capabilities/models/capabilitiesManager';
import { getConfig } from '@common/config';

// Mock the module before importing it — every getConfig() call across the codebase
// will receive our mocked version instead of hitting the real config system.
vi.mock('@common/config', () => ({
  getConfig: vi.fn(),
}));

let capabilitiesManager: CapabilitiesManager;
let configMock: DeepMockProxy<ConfigType>;

describe('CapabilitiesManager', () => {
  let logger: Logger;

  beforeAll(async function () {
    // ← async added
    logger = await jsLogger({ enabled: false }); // ← await added
  });

  beforeEach(function () {
    configMock = mockDeep<ConfigType>();
    vi.mocked(getConfig).mockReturnValue(configMock);
    capabilitiesManager = new CapabilitiesManager(logger, configMock);
  });

  afterEach(function () {
    vi.clearAllMocks();
  });

  describe('#getCapabilities', () => {
    describe('#HappyPath', () => {
      it('should return capabilities built from config values', function () {
        configMock.get.mockImplementation((key: string) => {
          const values: Record<string, unknown> = {
            site: 'AZURE',
            'opa.servers': { prod: 'http://opa-prod:8181', qa: 'http://opa-qa:8181' },
            'manager.enabled': true,
            'opa.enabled': true,
          };
          return values[key];
        });

        const capabilities = capabilitiesManager.getCapabilities();

        expect(capabilities).toMatchObject({
          site: 'AZURE',
          environments: ['prod', 'qa'],
          features: { managerEnabled: true, opaEnabled: true },
        });
      });

      it('should return an empty environments array when opa.servers is empty', function () {
        configMock.get.mockImplementation((key: string) => {
          const values: Record<string, unknown> = {
            site: 'AZURE',
            'opa.servers': {},
            'manager.enabled': false,
            'opa.enabled': false,
          };
          return values[key];
        });

        const capabilities = capabilitiesManager.getCapabilities();

        expect(capabilities.environments).toEqual([]);
      });
    });

    describe('#SadPath', () => {
      it('should propagate an error when config is not initialized', function () {
        vi.mocked(getConfig).mockImplementation(() => {
          throw new Error('config not initialized');
        });

        expect(() => capabilitiesManager.getCapabilities()).toThrow('config not initialized');
      });
    });
  });
});
