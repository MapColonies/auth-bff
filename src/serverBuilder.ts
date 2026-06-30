import express, { json, Router } from 'express';
import cors from 'cors';
import compression from 'compression';
import { OpenapiViewerRouter } from '@map-colonies/openapi-express-viewer';
import { getErrorHandlerMiddleware } from '@map-colonies/error-express-handler';
import { middleware as OpenApiMiddleware } from 'express-openapi-validator';
import { inject, injectable } from 'tsyringe';
import type { Logger } from '@map-colonies/js-logger';
import { httpLogger } from '@map-colonies/express-access-log-middleware';
import { collectMetricsExpressMiddleware } from '@map-colonies/prometheus';
import { Registry } from 'prom-client';
import type { ConfigType } from '@common/config';
import { SERVICES } from '@common/constants';
import { CAPABILITIES_ROUTER_SYMBOL } from './capabilities/routes/capabilitiesRouter';
import { MANAGER_ROUTER_SYMBOL } from './manager/routes/managerRouter';
import { OPA_ROUTER_SYMBOL } from './opa/routes/opaRouter';

@injectable()
export class ServerBuilder {
  private readonly serverInstance: express.Application;

  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: ConfigType,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.METRICS) private readonly metricsRegistry: Registry,
    @inject(CAPABILITIES_ROUTER_SYMBOL) private readonly capabilitiesRouter: Router,
    @inject(MANAGER_ROUTER_SYMBOL) private readonly managerRouter: Router,
    @inject(OPA_ROUTER_SYMBOL) private readonly opaRouter: Router
  ) {
    this.serverInstance = express();
  }

  public build(): express.Application {
    this.registerPreRoutesMiddleware();
    this.buildRoutes();
    this.registerPostRoutesMiddleware();

    return this.serverInstance;
  }

  private buildDocsRoutes(): void {
    const openapiRouter = new OpenapiViewerRouter({
      ...this.config.get('openapiConfig'),
      filePathOrSpec: this.config.get('openapiConfig.filePath'),
    });
    openapiRouter.setup();
    this.serverInstance.use(this.config.get('openapiConfig.basePath'), openapiRouter.getRouter());
  }

  private buildRoutes(): void {
    this.serverInstance.use('/capabilities', this.capabilitiesRouter);
    this.serverInstance.use('/manager', this.managerRouter);
    this.serverInstance.use('/opa', this.opaRouter);

    this.buildDocsRoutes();
  }

  private registerPreRoutesMiddleware(): void {
    // CORS must be first — before logging and any other middleware
    this.serverInstance.use(cors({ origin: this.config.get('cors.allowedDomains') }));

    this.serverInstance.use(collectMetricsExpressMiddleware({ registry: this.metricsRegistry }));
    this.serverInstance.use(httpLogger({ logger: this.logger, ignorePaths: ['/metrics'] }));

    if (this.config.get('server.response.compression.enabled')) {
      this.serverInstance.use(compression(this.config.get('server.response.compression.options') as unknown as compression.CompressionFilter));
    }

    this.serverInstance.use('/capabilities', json(this.config.get('server.request.payload')));

    const ignorePathRegex = new RegExp(`^(${this.config.get('openapiConfig.basePath')}|/manager|/opa)/.*`, 'i');
    const apiSpecPath = this.config.get('openapiConfig.filePath');
    this.serverInstance.use(OpenApiMiddleware({ apiSpec: apiSpecPath, validateRequests: true, ignorePaths: ignorePathRegex }));
  }

  private registerPostRoutesMiddleware(): void {
    this.serverInstance.use(getErrorHandlerMiddleware());
  }
}
