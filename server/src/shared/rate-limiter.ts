import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';
import { sendError } from './response.js';
import type { Request, Response } from 'express';

export const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(res, 'RATE_LIMITED', 'Too many requests, please try again later', 429);
  },
});

export const loginLimiter = rateLimit({
  windowMs: 60000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(res, 'RATE_LIMITED', 'Too many login attempts, please try again later', 429);
  },
});
