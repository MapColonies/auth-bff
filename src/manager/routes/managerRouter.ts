import { Router, type Request, type Response, type RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import type { FactoryFunction } from 'tsyringe';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { getConfig } from '@common/config';
import { managerEnabledMiddleware, authMiddleware } from '../middleware/managerMiddleware';

const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const managerRouterFactory: FactoryFunction<Router> = () => {
  const router = Router();
  const config = getConfig();

  const managerHandler = createProxyMiddleware({
    target: config.get('manager.url'),
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        (res as Response).status(httpStatus.BAD_GATEWAY).json({ message: 'Auth Manager is currently unreachable' });
      },
    },
  });

  // Thin router — just wires guards and proxy in order
  router.use(
    '/',
    managerEnabledMiddleware,
    authMiddleware,
    asyncHandler((req, res, next) => {
      void managerHandler(req, res, next);
    })
  );

  return router;
};

export const MANAGER_ROUTER_SYMBOL = Symbol('managerRouterFactory');
export { managerRouterFactory };
