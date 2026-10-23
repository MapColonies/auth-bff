import { Router, type Response } from 'express';
import httpStatus from 'http-status-codes';
import type { FactoryFunction } from 'tsyringe';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { SERVICES } from '@common/constants';
import type { ConfigType } from '@common/config';
import { authMiddleware } from '@src/common/middlewares/authMiddleware';

const managerRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const config = dependencyContainer.resolve<ConfigType>(SERVICES.CONFIG);
  const router = Router();

  if (!config.get('manager.enabled')) {
    router.use('/', (req, res) => {
      res.status(httpStatus.SERVICE_UNAVAILABLE).json({ message: 'Auth Manager capabilities are disabled on this node' });
    });
    return router;
  }

  const managerHandler = createProxyMiddleware({
    target: config.get('manager.url'),
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        (res as Response).status(httpStatus.BAD_GATEWAY).json({ message: 'Auth Manager is currently unreachable' });
      },
    },
  });

  // @typescript-eslint/no-misused-promises: the proxy handles its own promise via on.error
  router.use('/', authMiddleware, (req, res, next) => {
    void managerHandler(req, res, next);
  });

  return router;
};

export const MANAGER_ROUTER_SYMBOL = Symbol('managerRouterFactory');
export { managerRouterFactory };
