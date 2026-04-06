import type { Request, Response, NextFunction } from 'express';
import { writeAuditLog } from './audit.service.js';

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!AUDITED_METHODS.has(req.method)) {
    return next();
  }

  // Write audit after response is sent
  res.on('finish', () => {
    // Skip failed auth attempts from being double-logged
    if (req.path.includes('/auth/login') && res.statusCode !== 200) return;

    writeAuditLog({
      userId: req.user?.sub,
      username: req.user?.username,
      action: `${req.method} ${req.originalUrl}`,
      resource: req.originalUrl.split('/')[2] || 'unknown',
      resourceId: req.params.id || req.params.sid || req.params.agentId,
      details: res.statusCode >= 400 ? `status=${res.statusCode}` : undefined,
      traceId: res.locals.traceId as string,
      ipAddress: req.ip || req.socket.remoteAddress,
    });
  });

  next();
}
