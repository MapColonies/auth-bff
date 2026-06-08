**Auth Manager BFF**

Backend-For-Frontend

_Design & Implementation Document_

|                |                                |
| -------------- | ------------------------------ |
| **Author**     | Auth Platform Team             |
| **Status**     | In Development                 |
| **Stack**      | Node.js / TypeScript / Express |
| **Repository** | auth-manager-bff               |

# 1. Overview

The Auth Manager BFF (Backend-For-Frontend) is a dedicated
Node.js/TypeScript service that acts as the single entry point for the
auth-ui. Rather than the frontend communicating directly with multiple
backend services, it speaks to one BFF that handles routing, guards,
error normalisation, and capability discovery on its behalf.

**The BFF serves three responsibilities:**

- Single entry point — the UI never needs to know how many backends
  exist or where they are.

- Capability negotiation — the UI discovers what is enabled on each
  deployment via a /capabilities endpoint, then adapts its interface
  accordingly.

- Uniform error surface — all proxy errors are normalised to consistent
  JSON instead of raw HTML gateway errors.

# 2. Architecture

## 2.1 Tech Stack

|                          |                                                                           |
| ------------------------ | ------------------------------------------------------------------------- |
| **Component**            | **Choice**                                                                |
| **Runtime**              | Node.js with TypeScript                                                   |
| **Framework**            | Express (via ts-server-boilerplate)                                       |
| **Dependency Injection** | TSyringe — constructor injection with @injectable() decorators            |
| **Proxying**             | http-proxy-middleware — transparent request forwarding                    |
| **Validation**           | express-openapi-validator against openapi3.yaml                           |
| **Config**               | @map-colonies/config for boilerplate + bff.json for BFF-specific settings |
| **Observability**        | OpenTelemetry tracing headers passed through transparently                |

## 2.2 Request Flow

Every incoming request passes through the following layers in order:

1.  CORS middleware — validates the request origin against
    cors.allowedDomains in config. Rejects disallowed origins before any
    business logic runs.

2.  OpenAPI validator — validates requests and responses against
    openapi3.yaml for BFF-native routes only. Proxy routes (/manager/\*,
    /opa/\*) are explicitly excluded from validation.

3.  Router — dispatches to the appropriate handler based on the path
    prefix.

4.  Guard chain (proxy routes only) — toggle check, method filter,
    environment validation, authMiddleware placeholder.

5.  Handler — either builds a native response (capabilities) or forwards
    to an upstream service via http-proxy-middleware.

6.  Error handler — if the upstream is unreachable, returns a normalised
    JSON error instead of an HTML gateway page.

## 2.3 Code Structure

The project follows the three-layer pattern enforced by the boilerplate
for native routes:

```text
src/
├── capabilities/
│   ├── controllers/capabilitiesController.ts  ← HTTP layer
│   ├── models/capabilitiesManager.ts          ← Business logic
│   └── routes/capabilitiesRouter.ts           ← URL wiring
├── manager/
│   └── routes/managerRouter.ts                ← Proxy + toggle
├── opa/
│   └── routes/opaRouter.ts                    ← Proxy + guards
├── common/
│   ├── bffConfig.ts                           ← BFF config reader
│   └── config.ts                              ← Boilerplate config
├── containerConfig.ts                         ← DI wiring
└── serverBuilder.ts                           ← Express setup
config/
└── bff.json                                   ← BFF-specific config (local)
openapi3.yaml                                  ← API contract
```

# 3. API Endpoints

## 3.1 GET /capabilities — BFF Native

Returns the current state of the BFF so the auth-ui can adapt its
interface. This is the only endpoint the BFF owns natively — all others
are proxied.

**Example response:**

```json
{
  "site": "israel-dc-1",
  "environments": ["np", "stage", "prod"],
  "features": {
    "managerEnabled": true,
    "opaEnabled": true
  }
}
```

## 3.2 /manager/\* — Auth Manager Proxy

Proxies all traffic transparently to the auth-manager service. The
/manager prefix is stripped before forwarding.

|                   |                                                                          |
| ----------------- | ------------------------------------------------------------------------ |
| **Property**      | **Detail**                                                               |
| **Route**         | /manager/\*                                                              |
| **Example**       | GET /manager/client → GET http://auth-manager.internal:8080/client       |
| **Toggle off**    | 503 { "message": "Auth Manager capabilities are disabled on this node" } |
| **Unreachable**   | 502 { "message": "Auth Manager is currently unreachable" }               |
| **Auth (future)** | authMiddleware placeholder in place — will enforce JWTs in phase 2       |

## 3.3 /opa/{environment}/evaluate/\* — OPA Proxy

Proxies evaluation requests to the appropriate OPA server based on the
environment path parameter. Applies multiple guards before forwarding.

|                   |                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------- |
| **Property**      | **Detail**                                                                                |
| **Route**         | /opa/{environment}/evaluate/\*                                                            |
| **Path rewrite**  | POST /opa/prod/evaluate/authz/allow → POST http://opa-prod:8181/v1/data/authz/allow       |
| **Method filter** | Only GET and POST allowed. PUT/PATCH/DELETE return 405 to prevent policy modification.    |
| **Toggle off**    | 503 { "message": "OPA capabilities are disabled on this node" }                           |
| **Unknown env**   | 404 { "message": "OPA environment 'prod' not found" }                                     |
| **Unreachable**   | 502 { "message": "OPA server is unreachable", "environment": "prod", "targetUrl": "..." } |
| **Auth (future)** | authMiddleware placeholder in place — will enforce JWTs in phase 2                        |

# 4. Configuration

## 4.1 Schema

BFF-specific configuration is stored in config/bff.json locally and
overridden per environment via environment variables injected by Helm at
deploy time.

```json
{
  "site": "israel-dc-1",
  "cors": { "allowedDomains": ["https://auth-ui.internal"] },
  "manager": { "enabled": true, "url": "http://auth-manager.internal:8080" },
  "opa": {
    "enabled": true,
    "servers": {
      "np": "http://opa-np.internal:8181",
      "stage": "http://opa-stage.internal:8181",
      "prod": "http://opa-prod.internal:8181"
    }
  }
}
```

## 4.2 Environment Variable Overrides

Each field in bff.json can be overridden at runtime by an environment
variable. This means the Docker image is identical across all
environments — only the Helm values differ per deployment.

|                              |                  |                                 |
| ---------------------------- | ---------------- | ------------------------------- |
| **Environment Variable**     | **Type**         | **Example**                     |
| **BFF_SITE**                 | string           | israel-dc-1                     |
| **BFF_CORS_ALLOWED_DOMAINS** | comma-separated  | https://auth-ui.internal        |
| **BFF_MANAGER_ENABLED**      | "true" / "false" | true                            |
| **BFF_MANAGER_URL**          | string           | http://auth-manager:8080        |
| **BFF_OPA_ENABLED**          | "true" / "false" | true                            |
| **BFF_OPA_SERVERS**          | JSON string      | {"prod":"http://opa-prod:8181"} |

# 5. Security Considerations

## 5.1 Current Phase

- CORS — only origins listed in cors.allowedDomains are accepted. All
  others are rejected at the edge before any routing occurs.

- OPA method filtering — PUT, PATCH, and DELETE are blocked on all OPA
  evaluate routes to prevent any policy modification through the BFF.
  Only GET and POST are permitted.

- Toggle guards — manager and OPA routes each check their enabled flag
  before proxying. A single config change disables an entire route
  without a code deployment.

## 5.2 Future Phase — Authentication Middleware

The routing architecture is designed to support a future authentication
phase with zero structural changes. An authMiddleware function is
already in place on both the /manager/\* and /opa/\* routes, currently
calling next() as a placeholder.

In the future phase this middleware will be populated to validate JWTs
before any proxying occurs, making the BFF the Policy Enforcement Point
for the auth-ui. No changes to the router structure, the proxy logic, or
the guard chain will be required.

# 6. Implementation Steps

The service was built incrementally in the following order, each step
testable before the next began:

|        |                       |                                                                                                                                                           |
| ------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **\#** | **Step**              | **What was built**                                                                                                                                        |
| **1**  | **Boilerplate setup** | Cloned ts-server-boilerplate, renamed project, installed http-proxy-middleware.                                                                           |
| **2**  | **Config layer**      | Extended @map-colonies/config with BffConfig type. Created bff.json and getBffConfig() reader with env var override support.                              |
| **3**  | **GET /capabilities** | Three-layer pattern: CapabilitiesManager reads bff.json, CapabilitiesController handles HTTP, capabilitiesRouter wires the path. OpenAPI spec updated.    |
| **4**  | **/manager/\* proxy** | managerRouter with toggle check, authMiddleware placeholder, and http-proxy-middleware. OpenAPI validator bypassed for /manager/\* via ignorePaths regex. |
| **5**  | **/opa/\* proxy**     | opaRouter with toggle check, method filter (405), environment validation (404), dynamic target resolution, path rewriting, and contextual error response. |
| **6**  | **CORS**              | Pending — global Express CORS middleware to be wired from cors.allowedDomains config.                                                                     |

# 7. Deployment

The BFF is deployed as a Kubernetes workload using the Helm chart
included in the repository. The Docker image is built once and deployed
identically across environments — environment-specific config is
injected by Helm as environment variables, with no image rebuilds
required for config changes.

**Deployment command per environment:**

```
helm upgrade --install auth-manager-bff ./helm -f
helm/values-prod.yaml
```

# 8. Remaining Work

|                         |                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **Item**                | **Notes**                                                                                 |
| **CORS middleware**     | Wire Express cors package using cors.allowedDomains from bff.json.                        |
| **JWT auth middleware** | Populate authMiddleware placeholder on /manager/\* and /opa/\* routes.                    |
| **Integration tests**   | Test toggle, method filter, path rewriting, and error normalisation with a mock upstream. |
| **Helm values per env** | Create values-np.yaml, values-stage.yaml, values-prod.yaml with correct URLs.             |

