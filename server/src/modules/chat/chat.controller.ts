import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { chatService } from './chat.service.js';
import { validate } from '../../shared/validator.js';
import { sendSuccess, sendPaginated } from '../../shared/response.js';
import { createSessionSchema, sendMessageSchema } from './chat.types.js';
import { parsePagination } from '../../shared/types.js';

const router = Router();

// GET /api/chat/sessions
router.get('/sessions', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = chatService.listSessions(req.user!.sub);
    sendSuccess(res, sessions);
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/sessions
router.post('/sessions', requireAuth, validate(createSessionSchema), (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = chatService.createSession(req.body.agentId, req.user!.sub, req.body.title);
    sendSuccess(res, session, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/sessions/:sid
router.get('/sessions/:sid', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = chatService.getSession(req.params.sid, req.user!.sub);
    sendSuccess(res, session);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/chat/sessions/:sid
router.delete('/sessions/:sid', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    chatService.deleteSession(req.params.sid, req.user!.sub);
    sendSuccess(res, { message: 'Session deleted' });
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/sessions/:sid/messages
router.get('/sessions/:sid/messages', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, pageSize } = parsePagination(req.query);
    const { messages, total } = chatService.getMessages(req.params.sid, req.user!.sub, page, pageSize);
    sendPaginated(res, messages, { page, pageSize, total });
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/sessions/:sid/messages — SSE streaming response
router.post('/sessions/:sid/messages', requireAuth, validate(sendMessageSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    for await (const chunk of chatService.sendMessage(req.params.sid, req.body.content, req.user!.sub)) {
      if (chunk.done) {
        res.write(`event: done\ndata: ${JSON.stringify({ messageId: chunk.messageId, usage: chunk.usage })}\n\n`);
      } else {
        res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk.content, messageId: chunk.messageId })}\n\n`);
      }
    }

    res.end();
  } catch (err) {
    // If headers already sent, write error as SSE event
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ code: 'STREAM_ERROR', message: (err as Error).message })}\n\n`);
      res.end();
    } else {
      next(err);
    }
  }
});

// POST /api/chat/sessions/:sid/abort
router.post('/sessions/:sid/abort', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.body;
    await chatService.abortMessage(req.params.sid, req.user!.sub, messageId);
    sendSuccess(res, { message: 'Aborted' });
  } catch (err) {
    next(err);
  }
});

export const chatController = router;
