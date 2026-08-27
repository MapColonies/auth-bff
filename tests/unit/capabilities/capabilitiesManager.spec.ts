import { describe, beforeEach, afterEach, it, expect, vi, beforeAll } from 'vitest';
import { jsLogger, type Logger } from '@map-colonies/js-logger';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import type { ConfigType } from '@common/config';
import { CapabilitiesManager } from '@src/capabilities/models/capabilitiesManager';

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
  });
});
