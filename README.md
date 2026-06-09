# Auth Manager BFF

A Backend-For-Frontend (BFF) service that acts as the single entry point for the `auth-ui`. It routes traffic to the `auth-manager` service and multiple environment-specific Open Policy Agent (OPA) servers.

## Overview

The BFF shields the frontend from backend complexity — the UI never needs to know how many backends exist, where they are, or whether they are enabled on a given deployment. The BFF handles routing, guards, error normalisation, and capability discovery on the UI's behalf.

## Tech Stack

| Concern | Choice |
|---|---|
| Runtime | Node.js with TypeScript |
| Framework | Express (via `ts-server-boilerplate`) |
| Dependency Injection | TSyringe |
| Proxying | `http-proxy-middleware` |
| Request Validation | `express-openapi-validator` against `openapi3.yaml` |
| Configuration | `@map-colonies/config` |
| Observability | `@map-colonies/telemetry` (OpenTelemetry) |

## API

### `GET /capabilities`

Returns the current state of the BFF so the `auth-ui` can adapt its interface at startup.

```json
{
  "site": "AZURE",
  "environments": ["prod", "integration", "qa"],
  "features": {
    "managerEnabled": true,
    "opaEnabled": true
  }
}
```

### `/manager/*` — Auth Manager Proxy

Proxies all traffic transparently to the `auth-manager` service. The `/manager` prefix is stripped before forwarding.

```
GET /manager/client  →  GET http://auth-manager.internal:8080/client
```

| Condition | Response |
|---|---|
| `manager.enabled: false` | `503 { "message": "Auth Manager capabilities are disabled on this node" }` |
| Manager unreachable | `502 { "message": "Auth Manager is currently unreachable" }` |

### `/opa/{environment}/evaluate/*` — OPA Proxy

Proxies evaluation requests to the appropriate OPA server. Applies guards before forwarding.

```
POST /opa/prod/evaluate/authz/allow  →  POST http://opa-prod:8181/v1/data/authz/allow
```

| Guard | Condition | Response |
|---|---|---|
| Toggle | `opa.enabled: false` | `503` |
| Method filter | Any method except `GET` / `POST` | `405` |
| Environment validation | Environment not in config | `404` |
| Proxy error | OPA server unreachable | `502 { message, environment, targetUrl }` |

Only `GET` and `POST` are permitted — `PUT`, `PATCH`, and `DELETE` are blocked to prevent policy modification through the BFF.

## Project Structure

```
src/
  capabilities/
    controllers/capabilitiesController.ts   HTTP layer
    models/capabilitiesManager.ts           Business logic
    routes/capabilitiesRouter.ts            Route wiring
  manager/
    middleware/managerMiddleware.ts         Toggle check, auth placeholder
    routes/managerRouter.ts                 Proxy configuration
  opa/
    middleware/opaMiddleware.ts             Toggle, method filter, env validation, auth placeholder
    routes/opaRouter.ts                     Proxy configuration
  common/
    config.ts                               Unified config (boilerplate + BFF fields)
    constants.ts                            DI service tokens
  containerConfig.ts                        DI container wiring
  serverBuilder.ts                          Express setup and middleware chain
config/
  default.json                              Local development defaults
openapi3.yaml                               API contract (capabilities endpoint)
```

## Configuration

All configuration is managed through `@map-colonies/config`. In development, it reads from `config/default.json`. In production, it connects to the remote config server.

### BFF-specific fields

```json
{
  "site": "AZURE",
  "cors": {
    "allowedDomains": ["http://localhost:3000", "https://auth.mapcolonies.net"]
  },
  "manager": {
    "enabled": true,
    "url": "http://auth-manager.internal:8080"
  },
  "opa": {
    "enabled": true,
    "servers": {
      "prod": "http://opa-prod.internal:8181",
      "integration": "http://opa-int.internal:8181",
      "qa": "http://opa-qa.internal:8181"
    }
  }
}
```

The `manager.enabled` and `opa.enabled` flags allow individual proxy routes to be disabled per deployment without a code change or redeployment of the UI.

## Development

### Prerequisites

- Node.js (see `.nvmrc` for version)
- npm

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run start:dev
```

This enables `CONFIG_OFFLINE_MODE`, which reads configuration from `config/default.json` instead of connecting to the remote config server.

### Run tests

```bash
npm run test          # all tests
npm run test:unit     # unit tests only
npm run test:integration  # integration tests only
```

### Regenerate OpenAPI types

Run this after any change to `openapi3.yaml`:

```bash
npm run generate:openapi-types
```

## Request Flow

```
Request
  │
  ├── CORS middleware          validates origin against cors.allowedDomains
  ├── Metrics + HTTP logger
  ├── Compression
  ├── Body parser              scoped to /capabilities only
  ├── OpenAPI validator        native routes only — /manager and /opa are bypassed
  │
  ├── /capabilities ──────────► CapabilitiesController → CapabilitiesManager → config
  │
  ├── /manager/* ─────────────► managerEnabledMiddleware → authMiddleware → proxy
  │                                                                           │
  │                                                               http://auth-manager
  │
  └── /opa/{env}/evaluate/* ──► opaEnabledMiddleware → methodFilterMiddleware
                                  → environmentMiddleware → authMiddleware → proxy
                                                                              │
                                                              http://opa-{env}:8181
                                                              /v1/data/{policy path}
```

## OpenAPI Spec

The `openapi3.yaml` file is the source of truth for native BFF endpoints. Proxy routes (`/manager/*`, `/opa/*`) are intentionally excluded from the spec — their contracts belong to `auth-manager` and OPA respectively.

The interactive Swagger UI is available at `/docs` when the server is running.

## Future: Authentication Phase

An `authMiddleware` placeholder is already in place on both the `/manager/*` and `/opa/*` routes, currently passing all requests through. In the next phase this middleware will be populated to validate JWTs, making the BFF the Policy Enforcement Point for the `auth-ui`. No structural changes to the router or proxy logic will be required.

## Deployment

The service is deployed as a Kubernetes workload using the Helm chart in the `helm/` directory. Configuration is injected per environment via Helm values — the Docker image is identical across all environments.

```bash
helm upgrade --install auth-manager-bff ./helm -f helm/values-prod.yaml
```
