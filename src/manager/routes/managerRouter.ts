import { Router, type Response } from 'express';
import httpStatus from 'http-status-codes';
import type { FactoryFunction } from 'tsyringe';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { SERVICES } from '@common/constants';
import type { ConfigType } from '@common/config';
import { asyncHandler } from '@common/middlewares/asyncHandler';
import { authMiddleware } from '@src/common/middlewares/authMiddleware';
import { createManagerEnabledMiddleware } from '../middlewares/managerMiddleware';

const managerRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const config = dependencyContainer.resolve<ConfigType>(SERVICES.CONFIG);
  const router = Router();

  const managerHandler = createProxyMiddleware({
    target: config.get('manager.url'),
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        (res as Response).status(httpStatus.BAD_GATEWAY).json({ message: 'Auth Manager is currently unreachable' });
      },
    },
  });

  router.use(
    '/',
    createManagerEnabledMiddleware(config),
    authMiddleware,
    asyncHandler((req, res, next) => {
      void managerHandler(req, res, next);
    })
  );

  return router;
};

export const MANAGER_ROUTER_SYMBOL = Symbol('managerRouterFactory');
export { managerRouterFactory };
