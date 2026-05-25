import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import type { FactoryFunction } from 'tsyringe';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { getBffConfig } from '@common/bffConfig';

// Placeholder — will validate JWTs in the future auth phase
const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  next();
};

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

// 2. Create the wrapper that returns a standard Express RequestHandler
const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
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

  const managerHandler = createProxyMiddleware({
    target: bffConfig.manager.url,
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        (res as Response).status(httpStatus.BAD_GATEWAY).json({ message: 'Auth Manager is currently unreachable' });
      },
    },
  });

  router.use('/', asyncHandler(managerHandler));

  return router;
};

export const MANAGER_ROUTER_SYMBOL = Symbol('managerRouterFactory');

export { managerRouterFactory };
