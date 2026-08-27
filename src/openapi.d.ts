/* eslint-disable */
// This file was auto-generated. Do not edit manually.
// To update, run the error generation script again.

import type { TypedRequestHandlers as ImportedTypedRequestHandlers } from '@map-colonies/openapi-helpers/typedRequestHandler';
export type paths = {
  '/capabilities': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Get BFF capabilities
     * @description Returns the current state of the BFF so the auth-ui can adapt its interface at startup.
     *
     *     The `environments` array is derived from the keys of the `opa.servers` config object — it represents the OPA environments reachable through this BFF node.
     *
     *     The `features` flags indicate whether the auth-manager and OPA proxy routes are enabled on this deployment. The UI should use these flags to conditionally render relevant functionality rather than calling the proxy routes and handling a 503 response.
     */
    get: operations['getCapabilities'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
};
export type webhooks = Record<string, never>;
export type components = {
  schemas: {
    /** @description Standard error response returned by all BFF-native endpoints on failure. */
    error: {
      /**
       * @description Human-readable description of the error.
       * @example config not initialized
       */
      message: string;
    };
    /**
     * @description Describes the current capabilities of this BFF deployment node.
     *     The auth-ui calls this endpoint on startup and uses the response to decide which features to render.
     */
    capabilities: {
      /**
       * @description Identifier of the deployment site this BFF node is running on.
       * @example israel-dc-1
       */
      site: string;
      /**
       * @description List of OPA environment names available through this BFF node.
       *     Derived from the keys of the `opa.servers` configuration object.
       *     The UI uses this list to populate environment selectors.
       * @example [
       *       "prod",
       *       "integration",
       *       "qa"
       *     ]
       */
      environments: string[];
      /** @description Feature flags indicating which proxy capabilities are active on this node. */
      features: {
        /**
         * @description Whether the `/manager/*` proxy route is enabled on this node.
         *     When `false`, all requests to `/manager/*` return `503 Service Unavailable`.
         * @example true
         */
        managerEnabled: boolean;
        /**
         * @description Whether the `/opa/*` proxy route is enabled on this node.
         *     When `false`, all requests to `/opa/*` return `503 Service Unavailable`.
         * @example true
         */
        opaEnabled: boolean;
      };
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
};
export type $defs = Record<string, never>;
export interface operations {
  getCapabilities: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Capabilities retrieved successfully. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          /**
           * @example {
           *       "site": "israel-dc-1",
           *       "environments": [
           *         "prod",
           *         "integration",
           *         "qa"
           *       ],
           *       "features": {
           *         "managerEnabled": true,
           *         "opaEnabled": true
           *       }
           *     }
           */
          'application/json': components['schemas']['capabilities'];
        };
      };
      /** @description Bad request — an unknown query parameter was supplied. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          /**
           * @example {
           *       "message": "Unknown query parameter 'foo'"
           *     }
           */
          'application/json': components['schemas']['error'];
        };
      };
      /** @description Internal server error — an unexpected error occurred while building the capabilities response (e.g. config not initialised). */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          /**
           * @example {
           *       "message": "config not initialized"
           *     }
           */
          'application/json': components['schemas']['error'];
        };
      };
    };
  };
}
export type TypedRequestHandlers = ImportedTypedRequestHandlers<paths, operations>;
