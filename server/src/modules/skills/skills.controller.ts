import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { getGateway } from '../../gateway/index.js';
import { sendSuccess } from '../../shared/response.js';
import { validate } from '../../shared/validator.js';
import { z } from 'zod';

const installSkillSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().min(1),
  category: z.enum(['core', 'tool', 'plugin']),
  author: z.string().min(1),
});

const router = Router();

router.get('/', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await getGateway().listSkills());
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('admin'), validate(installSkillSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const skill = await getGateway().installSkill(req.body);
    sendSuccess(res, skill, 201);
  } catch (err) { next(err); }
});

router.post('/:id/toggle', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enabled = req.body.enabled !== false;
    await getGateway().toggleSkill(req.params.id, enabled);
    sendSuccess(res, { message: enabled ? 'Enabled' : 'Disabled' });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getGateway().deleteSkill(req.params.id);
    sendSuccess(res, { message: 'Skill removed' });
  } catch (err) { next(err); }
});

export const skillsController = router;
