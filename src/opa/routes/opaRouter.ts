import { Router, type Request, type Response } from 'express';
import httpStatus from 'http-status-codes';
import type { FactoryFunction } from 'tsyringe';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { SERVICES } from '@common/constants';
import type { ConfigType, Environment } from '@common/config';
import { asyncHandler } from '@common/middlewares/asyncHandler';
import { authMiddleware } from '@common/middlewares/authMiddleware';
import { createOpaEnabledMiddleware, opaMethodFilterMiddleware, createOpaEnvironmentMiddleware } from '../middlewares/opaMiddleware';

const opaRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const config = dependencyContainer.resolve<ConfigType>(SERVICES.CONFIG);
  const router = Router();

  const opaHandler = createProxyMiddleware({
    target: 'http://placeholder',
    changeOrigin: true,
    router: (req) => {
      const environment = ((req as Request).params['environment'] ?? '') as Environment;
      const servers = config.get('opa.servers');
      return servers[environment];
    },
    pathRewrite: (path, req) => {
      const environment = (req as Request).params['environment'] as string;
      return path.replace(`/${environment}/evaluate`, '/v1/data');
    },
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
    createOpaEnabledMiddleware(config),
    opaMethodFilterMiddleware,
    createOpaEnvironmentMiddleware(config),
    authMiddleware,
    asyncHandler((req, res, next) => {
      void opaHandler(req, res, next);
    })
  );

  return router;
};

export const OPA_ROUTER_SYMBOL = Symbol('opaRouterFactory');
export { opaRouterFactory };
