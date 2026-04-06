import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { getGateway } from '../../gateway/index.js';
import { sendSuccess } from '../../shared/response.js';
import { validate } from '../../shared/validator.js';
import { createChannelSchema, updateChannelSchema } from './channels.types.js';

const router = Router();

router.get('/', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await getGateway().listChannels());
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('admin'), validate(createChannelSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await getGateway().createChannel(req.body), 201);
  } catch (err) { next(err); }
});

router.patch('/:id', requireAuth, requireRole('admin'), validate(updateChannelSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await getGateway().updateChannel(req.params.id, req.body));
  } catch (err) { next(err); }
});

router.post('/:id/toggle', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enabled = req.body.enabled !== false;
    await getGateway().toggleChannel(req.params.id, enabled);
    sendSuccess(res, { message: enabled ? 'Connected' : 'Disconnected' });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getGateway().deleteChannel(req.params.id);
    sendSuccess(res, { message: 'Channel deleted' });
  } catch (err) { next(err); }
});

export const channelsController = router;
