import type { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status-codes';
import { getConfig } from '@common/config';

export const managerEnabledMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!getConfig().get('manager.enabled')) {
    res.status(httpStatus.SERVICE_UNAVAILABLE).json({ message: 'Auth Manager capabilities are disabled on this node' });
    return;
  }
  next();
};

// Placeholder — will validate JWTs in the future auth phase
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  next();
};
