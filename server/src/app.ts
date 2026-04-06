import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config/index.js';
import { logger } from './shared/logger.js';
import { healthController } from './modules/health/health.controller.js';
import { authController } from './modules/auth/auth.controller.js';
import { agentsController } from './modules/agents/agents.controller.js';
import { chatController } from './modules/chat/chat.controller.js';
import { officeController } from './modules/office/office.controller.js';
import { channelsController } from './modules/channels/channels.controller.js';
import { tasksController } from './modules/tasks/tasks.controller.js';
import { skillsController } from './modules/skills/skills.controller.js';
import { settingsController } from './modules/settings/settings.controller.js';
import { logsController } from './modules/logs/logs.controller.js';
import { auditController } from './audit/audit.controller.js';
import { auditMiddleware } from './audit/audit.middleware.js';
import { globalLimiter, loginLimiter } from './shared/rate-limiter.js';
import { AppError } from './shared/errors.js';
import { sendError } from './shared/response.js';
import type { Request, Response, NextFunction } from 'express';

export function createApp() {
  const app = express();

  // ── Security ──
  app.use(helmet());
  app.use(cors({
    origin: config.cors.origin,
    credentials: true,
  }));

  // ── Body parsing ──
  app.use(express.json({ limit: '1mb' }));

  // ── Rate Limiting ──
  app.use('/api', globalLimiter);
  app.use('/api/auth/login', loginLimiter);

  // ── Request logging ──
  app.use(pinoHttp({ logger, autoLogging: config.nodeEnv !== 'test' }));

  // ── Trace ID ──
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.traceId = (req.headers['x-trace-id'] as string) || uuidv4();
    next();
  });

  // ── Audit ──
  app.use(auditMiddleware);

  // ── Routes ──
  app.use('/api', healthController);
  app.use('/api/auth', authController);
  app.use('/api/agents', agentsController);
  app.use('/api/chat', chatController);
  app.use('/api/office', officeController);
  app.use('/api/channels', channelsController);
  app.use('/api/tasks', tasksController);
  app.use('/api/skills', skillsController);
  app.use('/api/settings', settingsController);
  app.use('/api/logs', logsController);
  app.use('/api/audit', auditController);

  // ── 404 ──
  app.use((_req: Request, res: Response) => {
    sendError(res, 'NOT_FOUND', 'Endpoint not found', 404);
  });

  // ── Error handler ──
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      sendError(res, err.code, err.message, err.statusCode, err.details);
    } else {
      logger.error(err, 'Unhandled error');
      sendError(
        res,
        'INTERNAL_ERROR',
        config.nodeEnv === 'production' ? 'Internal server error' : err.message,
        500,
      );
    }
  });

  return app;
}
