import fs from 'node:fs';
import path from 'node:path';

interface BffConfig {
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
    servers: Record<string, string>;
  };
}

function readJsonFile(): BffConfig {
  const configPath = path.resolve(process.cwd(), 'config', 'bff.json');
  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw) as BffConfig;
}

function resolveConfig(): BffConfig {
  const fileConfig = readJsonFile();

  // Each env var overrides the matching field from the file.
  // In Kubernetes these come from the Helm values → ConfigMap/Deployment env block.
  return {
    site: process.env['BFF_SITE'] ?? fileConfig.site,

    cors: {
      // Comma-separated: "https://auth-ui.internal,http://localhost:3000"
      allowedDomains: process.env['BFF_CORS_ALLOWED_DOMAINS'] ? process.env['BFF_CORS_ALLOWED_DOMAINS'].split(',') : fileConfig.cors.allowedDomains,
    },

    manager: {
      enabled: process.env['BFF_MANAGER_ENABLED'] !== undefined ? process.env['BFF_MANAGER_ENABLED'] === 'true' : fileConfig.manager.enabled,
      url: process.env['BFF_MANAGER_URL'] ?? fileConfig.manager.url,
    },

    opa: {
      enabled: process.env['BFF_OPA_ENABLED'] !== undefined ? process.env['BFF_OPA_ENABLED'] === 'true' : fileConfig.opa.enabled,
      // JSON string: '{"np":"http://opa-np:8181","prod":"http://opa-prod:8181"}'
      servers: process.env['BFF_OPA_SERVERS'] ? (JSON.parse(process.env['BFF_OPA_SERVERS']) as Record<string, string>) : fileConfig.opa.servers,
    },
  };
}

let bffConfigInstance: BffConfig | undefined;

export function getBffConfig(): BffConfig {
  if (!bffConfigInstance) {
    bffConfigInstance = resolveConfig();
  }
  return bffConfigInstance;
}

export type { BffConfig };
