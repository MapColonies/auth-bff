import type { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status-codes';
import type { ConfigType } from '@common/config';

// Factory — accepts config, returns the middleware function
export const createManagerEnabledMiddleware = (config: ConfigType) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!config.get('manager.enabled')) {
      res.status(httpStatus.SERVICE_UNAVAILABLE).json({ message: 'Auth Manager capabilities are disabled on this node' });
      return;
    }
    next();
  };
};
