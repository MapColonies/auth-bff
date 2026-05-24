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
    /** Returns the current BFF capabilities so the UI can adapt its interface */
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
    error: {
      message: string;
    };
    capabilities: {
      /**
       * @description The identifier of the current deployment site
       * @example israel-dc-1
       */
      site: string;
      /**
       * @description List of OPA environment names available on this node
       * @example [
       *       "np",
       *       "stage",
       *       "prod"
       *     ]
       */
      environments: string[];
      features: {
        /**
         * @description Whether the auth-manager proxy is enabled on this node
         * @example true
         */
        managerEnabled: boolean;
        /**
         * @description Whether the OPA proxy is enabled on this node
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
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['capabilities'];
        };
      };
    };
  };
}
export type TypedRequestHandlers = ImportedTypedRequestHandlers<paths, operations>;
