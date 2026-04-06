import { Router, type Request, type Response } from 'express';
import { sendSuccess } from '../../shared/response.js';
import { getGatewayStatus } from '../../gateway/index.js';

const router = Router();

const startTime = Date.now();

router.get('/health', (_req: Request, res: Response) => {
  const gateway = getGatewayStatus();
  sendSuccess(res, {
    status: 'ok',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    gateway,
    db: true,
  });
});

export const healthController = router;
