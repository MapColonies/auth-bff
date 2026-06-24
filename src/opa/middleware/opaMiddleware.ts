import type { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status-codes';
import type { ConfigType } from '@common/config';

const ALLOWED_METHODS = ['GET', 'POST'];

export const createOpaEnabledMiddleware = (config: ConfigType) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!config.get('opa.enabled')) {
      res.status(httpStatus.SERVICE_UNAVAILABLE).json({ message: 'OPA capabilities are disabled on this node' });
      return;
    }
    next();
  };
};

// No config dependency — stays as a plain function
export const opaMethodFilterMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!ALLOWED_METHODS.includes(req.method.toUpperCase())) {
    res.status(httpStatus.METHOD_NOT_ALLOWED).json({ message: `Method ${req.method} is not allowed on OPA evaluate endpoints` });
    return;
  }
  next();
};

export const createOpaEnvironmentMiddleware = (config: ConfigType) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { environment } = req.params;

    if (!environment) {
      res.status(httpStatus.BAD_REQUEST).json({ message: 'Missing environment parameter' });
      return;
    }

    if (!(environment in (config.get('opa.servers') as Record<string, string>))) {
      res.status(httpStatus.NOT_FOUND).json({ message: `OPA environment '${environment}' not found` });
      return;
    }

    next();
  };
};

// No config dependency — stays as a plain function
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  next();
};
