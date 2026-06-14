import { describe, it, expect, beforeEach } from 'vitest';
import { CapabilitiesManager } from '../../../../src/capabilities/models/capabilitiesManager';
import { type AppConfig } from '../../../../src/common/interfaces';

describe('CapabilitiesManager Unit Tests', () => {
  let mockConfig: AppConfig;
  let manager: CapabilitiesManager;

  beforeEach(() => {
    // 1. Arrange baseline mock configuration
    mockConfig = {
      site: 'israel-dc-1',
      cors: { allowedDomains: [] },
      manager: { enabled: true, url: 'http://auth-manager.internal:8080' },
      opa: {
        enabled: true,
        servers: {
          np: 'http://opa-np.internal:8181',
          prod: 'http://opa-prod.internal:8181',
        },
      },
    };

    // 2. Direct constructor injection (Standard unit test practice)
    manager = new CapabilitiesManager(mockConfig);
  });

  it('should correctly map configuration data into service capabilities properties', () => {
    const result = manager.getCapabilities();

    expect(result.site).toBe('israel-dc-1');
    expect(result.environments).toEqual(['np', 'prod']);
    expect(result.features.managerEnabled).toBe(true);
    expect(result.features.opaEnabled).toBe(true);
  });

  it('should return empty environments if no OPA servers are defined', () => {
    mockConfig.opa.servers = {};
    const result = manager.getCapabilities();

    expect(result.environments).toEqual([]);
  });
});
