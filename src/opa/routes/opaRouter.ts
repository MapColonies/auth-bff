import { Router, type Request, type Response, type NextFunction } from 'express';
import type { FactoryFunction } from 'tsyringe';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { getBffConfig } from '@common/bffConfig';

const ALLOWED_METHODS = ['GET', 'POST'];

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  next();
};

const opaRouterFactory: FactoryFunction<Router> = () => {
  const router = Router();
  const bffConfig = getBffConfig();

  // Toggle check
  router.use('/:environment/evaluate', (req: Request, res: Response, next: NextFunction): void => {
    if (!bffConfig.opa.enabled) {
      res.status(503).json({ message: 'OPA capabilities are disabled on this node' });
      return;
    }
    next();
  });

  // Method filtering
  router.use('/:environment/evaluate', (req: Request, res: Response, next: NextFunction): void => {
    if (!ALLOWED_METHODS.includes(req.method.toUpperCase())) {
      res.status(405).json({ message: `Method ${req.method} is not allowed on OPA evaluate endpoints` });
      return;
    }
    next();
  });

  // Environment validation
  router.use('/:environment/evaluate', (req: Request, res: Response, next: NextFunction): void => {
    const { environment } = req.params;

    if (!environment) {
      res.status(400).json({ message: 'Missing environment parameter' });
      return;
    }

    if (!(environment in bffConfig.opa.servers)) {
      res.status(404).json({ message: `OPA environment '${environment}' not found` });
      return;
    }

    next();
  });

  router.use('/:environment/evaluate', authMiddleware);

  // Proxy
  router.use(
    '/:environment/evaluate',
    createProxyMiddleware({
      target: 'http://placeholder',
      changeOrigin: true,
      router: (req: Request) => {
        const environment = req.params['environment'] as string;
        return bffConfig.opa.servers[environment];
      },
      pathRewrite: (path, req) => {
        const environment = (req as Request).params['environment'] as string;
        return path.replace(`/${environment}/evaluate`, '/v1/data');
      },
      on: {
        error: (err, req, res) => {
          const environment = (req as Request).params['environment'] as string;
          const targetUrl = bffConfig.opa.servers[environment];
          (res as Response).status(502).json({
            message: 'OPA server is unreachable',
            environment,
            targetUrl,
          });
        },
      },
    })
  );

  return router;
};

export const OPA_ROUTER_SYMBOL = Symbol('opaRouterFactory');

export { opaRouterFactory };
