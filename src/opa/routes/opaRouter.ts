import { Router, type Request, type Response } from 'express';
import httpStatus from 'http-status-codes';
import type { FactoryFunction } from 'tsyringe';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { SERVICES } from '@common/constants';
import type { ConfigType, Environment } from '@common/config';
import { authMiddleware } from '@common/middlewares/authMiddleware';
import { opaMethodFilterMiddleware, createOpaEnvironmentMiddleware } from '../middlewares/opaMiddleware';

const opaRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const config = dependencyContainer.resolve<ConfigType>(SERVICES.CONFIG);
  const router = Router();

  if (!config.get('opa.enabled')) {
    router.use('/', (req, res) => {
      res.status(httpStatus.SERVICE_UNAVAILABLE).json({ message: 'OPA capabilities are disabled on this node' });
    });
    return router;
  }

  const opaHandler = createProxyMiddleware({
    target: 'http://placeholder',
    changeOrigin: true,
    router: (req) => {
      const environment = ((req as Request).params['environment'] ?? '') as Environment;
      const servers = config.get('opa.servers');
      return servers[environment];
    },
    pathRewrite: (path) => `/v1/data${path}`,
    on: {
      error: (err, req, res) => {
        const environment = ((req as Request).params['environment'] ?? '') as Environment;
        const servers = config.get('opa.servers');
        const targetUrl = servers[environment];
        (res as Response).status(httpStatus.BAD_GATEWAY).json({
          message: 'OPA server is unreachable',
          environment,
          targetUrl,
        });
      },
    },
  });

  router.use(
    '/:environment/evaluate',
    opaMethodFilterMiddleware,
    createOpaEnvironmentMiddleware(config),
    authMiddleware,
    // @typescript-eslint/no-misused-promises: the proxy handles its own promise via on.error
    (req, res, next) => {
      void opaHandler(req, res, next);
    }
  );

  return router;
};

export const OPA_ROUTER_SYMBOL = Symbol('opaRouterFactory');
export { opaRouterFactory };
