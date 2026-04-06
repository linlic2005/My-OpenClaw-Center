import { Router, type Request, type Response } from 'express';
import { requireAuth, requireRole } from '../modules/auth/auth.middleware.js';
import { queryAuditLogs } from './audit.service.js';
import { sendSuccess } from '../shared/response.js';

const router = Router();

// GET /api/audit
router.get('/', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const logs = queryAuditLogs({
    limit: Number(req.query.limit) || 50,
    offset: Number(req.query.offset) || 0,
    action: req.query.action as string | undefined,
    resource: req.query.resource as string | undefined,
  });
  sendSuccess(res, logs);
});

export const auditController = router;
