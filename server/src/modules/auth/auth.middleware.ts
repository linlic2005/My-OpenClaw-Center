import type { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { UnauthorizedError, ForbiddenError } from '../../shared/errors.js';
import type { Role, TokenPayload } from './auth.types.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing authorization header'));
  }

  const token = header.slice(7);
  try {
    req.user = authService.verifyToken(token, 'access');
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}
