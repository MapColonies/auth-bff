import { Router, type Request, type Response } from 'express';
import httpStatus from 'http-status-codes';
import type { FactoryFunction } from 'tsyringe';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { getConfig, type Environment } from '@common/config';
import { asyncHandler } from '@common/middleware/asyncHandler';
import { opaEnabledMiddleware, opaMethodFilterMiddleware, opaEnvironmentMiddleware, authMiddleware } from '../middleware/opaMiddleware';

const opaRouterFactory: FactoryFunction<Router> = () => {
  const router = Router();
  const config = getConfig();

  const opaHandler = createProxyMiddleware({
    target: 'http://placeholder',
    changeOrigin: true,
    router: (req) => {
      const environment = (req as Request).params['environment'] as Environment;
      const servers = config.get('opa.servers');
      return servers[environment];
    },
    pathRewrite: (path, req) => {
      const environment = (req as Request).params['environment'] as string;
      return path.replace(`/${environment}/evaluate`, '/v1/data');
    },
    on: {
      error: (err, req, res) => {
        const environment = (req as Request).params['environment'] as Environment;
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

  // Thin router — just wires guards and proxy in order
  router.use(
    '/:environment/evaluate',
    opaEnabledMiddleware,
    opaMethodFilterMiddleware,
    opaEnvironmentMiddleware,
    authMiddleware,
    asyncHandler((req, res, next) => {
      void opaHandler(req, res, next);
    })
  );

  return router;
};

export const OPA_ROUTER_SYMBOL = Symbol('opaRouterFactory');
export { opaRouterFactory };
