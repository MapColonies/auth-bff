import { Router, type Request, type Response, type NextFunction } from 'express';
import httpStatus from 'http-status-codes';
import type { FactoryFunction } from 'tsyringe';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { getBffConfig } from '@common/bffConfig';

// Placeholder — will validate JWTs in the future auth phase
const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  next();
};

const managerRouterFactory: FactoryFunction<Router> = () => {
  const router = Router();
  const bffConfig = getBffConfig();

  // Toggle check — if manager is disabled, short-circuit with 503
  router.use('/', (req: Request, res: Response, next: NextFunction): void => {
    if (!bffConfig.manager.enabled) {
      res.status(httpStatus.SERVICE_UNAVAILABLE).json({ message: 'Auth Manager capabilities are disabled on this node' });
      return;
    }
    next();
  });

  router.use('/', authMiddleware);

  router.use(
    '/',
    createProxyMiddleware({
      target: bffConfig.manager.url,
      changeOrigin: true,
      on: {
        error: (err, req, res) => {
          (res as Response).status(httpStatus.BAD_GATEWAY).json({ message: 'Auth Manager is currently unreachable' });
        },
      },
    })
  );

  return router;
};

export const MANAGER_ROUTER_SYMBOL = Symbol('managerRouterFactory');

export { managerRouterFactory };
