import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { getGateway } from '../../gateway/index.js';
import { sendSuccess } from '../../shared/response.js';
import { validate } from '../../shared/validator.js';
import { z } from 'zod';

const createTaskSchema = z.object({
  name: z.string().min(1),
  schedule: z.string().min(1),
  agentId: z.string().min(1),
  type: z.enum(['cron', 'once']).default('cron'),
});

const router = Router();

router.get('/', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await getGateway().listTasks());
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('admin'), validate(createTaskSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await getGateway().createTask(req.body);
    sendSuccess(res, task, 201);
  } catch (err) { next(err); }
});

router.post('/:id/toggle', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enabled = req.body.enabled !== false;
    await getGateway().toggleTask(req.params.id, enabled);
    sendSuccess(res, { message: enabled ? 'Resumed' : 'Paused' });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getGateway().deleteTask(req.params.id);
    sendSuccess(res, { message: 'Task deleted' });
  } catch (err) { next(err); }
});

router.post('/:id/run', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getGateway().runTask(req.params.id);
    sendSuccess(res, { message: 'Task triggered' });
  } catch (err) { next(err); }
});

export const tasksController = router;
