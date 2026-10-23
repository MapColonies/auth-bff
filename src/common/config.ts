import { type ConfigInstance, config } from '@map-colonies/config';
import { commonBoilerplateV3, type commonBoilerplateV3Type } from '@map-colonies/schemas';

// TODO: move to @map-colonies/schemas. Until then the boilerplate is deep-cloned and given its own $id —
// @map-colonies/config fetches the remote config by $id, so reusing common/boilerplate/v3 would collide with it.
const baseSchema = structuredClone(commonBoilerplateV3);

const bffSchema = {
  ...baseSchema,
  $id: 'https://mapcolonies.com/infra/opala/bff/v1',
  title: 'opalaBffSchemaV1',
  description: 'The opala auth BFF service schema',
  properties: {
    ...baseSchema.properties,
    site: { type: 'string', 'x-env-value': 'SITE' },
    cors: {
      type: 'object',
      required: ['allowedDomains'],
      properties: {
        allowedDomains: { type: 'array', items: { type: 'string' }, 'x-env-value': 'CORS_ALLOWED_DOMAINS', 'x-env-format': 'json' },
      },
    },
    manager: {
      type: 'object',
      required: ['enabled', 'url'],
      properties: {
        enabled: { type: 'boolean', 'x-env-value': 'MANAGER_ENABLED' },
        url: { type: 'string', 'x-env-value': 'MANAGER_URL' },
      },
    },
    opa: {
      type: 'object',
      required: ['enabled', 'servers'],
      properties: {
        enabled: { type: 'boolean', 'x-env-value': 'OPA_ENABLED' },
        servers: {
          type: 'object',
          additionalProperties: { type: 'string' },
          'x-env-value': 'OPA_SERVERS',
          'x-env-format': 'json',
        },
      },
    },
  },
  required: [...baseSchema.required, 'site', 'cors', 'manager', 'opa'],
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
