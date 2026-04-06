import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireRole } from '../auth/auth.middleware.js';
import { agentsService } from './agents.service.js';
import { validate } from '../../shared/validator.js';
import { sendSuccess } from '../../shared/response.js';
import { createAgentSchema, updateAgentSchema } from './agents.types.js';

const router = Router();

// GET /api/agents
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agents = await agentsService.list({
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
    });
    sendSuccess(res, agents);
  } catch (err) {
    next(err);
  }
});

// GET /api/agents/:id
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agent = await agentsService.getById(req.params.id);
    sendSuccess(res, agent);
  } catch (err) {
    next(err);
  }
});

// POST /api/agents
router.post('/', requireAuth, requireRole('admin'), validate(createAgentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agent = await agentsService.create(req.body);
    sendSuccess(res, agent, 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/agents/:id
router.patch('/:id', requireAuth, requireRole('admin'), validate(updateAgentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agent = await agentsService.update(req.params.id, req.body);
    sendSuccess(res, agent);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/agents/:id
router.delete('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await agentsService.delete(req.params.id);
    sendSuccess(res, { message: 'Agent deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/agents/:id/restart
router.post('/:id/restart', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await agentsService.restart(req.params.id);
    sendSuccess(res, { message: 'Agent restarted' });
  } catch (err) {
    next(err);
  }
});

export const agentsController = router;
