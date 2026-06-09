import { type ConfigInstance, config } from '@map-colonies/config';
import { commonBoilerplateV3, type commonBoilerplateV3Type } from '@map-colonies/schemas';

// Extend the boilerplate schema by spreading its properties and adding BFF-specific ones.
// The spread preserves 'unevaluatedProperties: false' from the base schema,
// and adding our fields to 'properties' means they ARE evaluated — so no validation error.

const bffSchema = {
  ...commonBoilerplateV3,
  properties: {
    ...commonBoilerplateV3.properties,
    site: { type: 'string' },
    cors: {
      type: 'object',
      required: ['allowedDomains'],
      properties: {
        allowedDomains: { type: 'array', items: { type: 'string' } },
      },
    },
    manager: {
      type: 'object',
      required: ['enabled', 'url'],
      properties: {
        enabled: { type: 'boolean' },
        url: { type: 'string' },
      },
    },
    opa: {
      type: 'object',
      required: ['enabled', 'servers'],
      properties: {
        enabled: { type: 'boolean' },
        servers: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
  required: [...(Array.isArray(commonBoilerplateV3.required) ? commonBoilerplateV3.required : []), 'site', 'cors', 'manager', 'opa'],
};

type ConfigType = ConfigInstance<commonBoilerplateV3Type & BffConfig>;

let configInstance: ConfigType | undefined;

async function initConfig(offlineMode?: boolean): Promise<void> {
  configInstance = (await config({
    schema: bffSchema,
    offlineMode,
  })) as unknown as ConfigType;
}

function getConfig(): ConfigType {
  if (!configInstance) {
    throw new Error('config not initialized');
  }
  return configInstance;
}
export interface BffConfig {
  site: string;
  cors: {
    allowedDomains: string[];
  };
  manager: {
    enabled: boolean;
    url: string;
  };
  opa: {
    enabled: boolean;
    servers: Record<Environment, string>; // string keys — no hardcoded environments
  };
}

export { getConfig, initConfig };
export type { ConfigType };
export type Environment = 'prod' | 'stage' | 'np';
