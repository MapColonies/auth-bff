import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import type { FactoryFunction } from 'tsyringe';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { getBffConfig, type Environment } from '@common/bffConfig';

const ALLOWED_METHODS = ['GET', 'POST'];

const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  next();
};

const opaRouterFactory: FactoryFunction<Router> = () => {
  const router = Router();
  const bffConfig = getBffConfig();

  // Toggle check
  router.use('/:environment/evaluate', (req: Request, res: Response, next: NextFunction): void => {
    if (!bffConfig.opa.enabled) {
      res.status(httpStatus.SERVICE_UNAVAILABLE).json({ message: 'OPA capabilities are disabled on this node' });
      return;
    }
    next();
  });

  // Method filtering
  router.use('/:environment/evaluate', (req: Request, res: Response, next: NextFunction): void => {
    if (!ALLOWED_METHODS.includes(req.method.toUpperCase())) {
      res.status(httpStatus.METHOD_NOT_ALLOWED).json({ message: `Method ${req.method} is not allowed on OPA evaluate endpoints` });
      return;
    }
    next();
  });

  // Environment validation
  router.use('/:environment/evaluate', (req: Request, res: Response, next: NextFunction): void => {
    const { environment } = req.params;

    if (environment === undefined || environment === '') {
      res.status(httpStatus.BAD_REQUEST).json({ message: 'Missing environment parameter' });
      return;
    }

    if (!(environment in bffConfig.opa.servers)) {
      res.status(httpStatus.NOT_FOUND).json({ message: `OPA environment '${environment}' not found` });
      return;
    }

    next();
  });

  router.use('/:environment/evaluate', authMiddleware);

  const opaHandler = createProxyMiddleware({
    target: 'http://placeholder',
    changeOrigin: true,
    router: (req) => {
      const environment = (req as Request).params['environment'] as Environment;
      return bffConfig.opa.servers[environment];
    },
    pathRewrite: (path, req) => {
      const environment = (req as Request).params['environment'] as string;
      return path.replace(`/${environment}/evaluate`, '/v1/data');
    },
    on: {
      error: (err, req, res) => {
        const environment = (req as Request).params['environment'] as Environment;
        const targetUrl = bffConfig.opa.servers[environment];
        (res as Response).status(httpStatus.BAD_GATEWAY).json({
          message: 'OPA server is unreachable',
          environment,
          targetUrl,
        });
      },
    },
  });

  router.use('/:environment/evaluate', asyncHandler(opaHandler));

  return router;
};

export const OPA_ROUTER_SYMBOL = Symbol('opaRouterFactory');
export { opaRouterFactory };
