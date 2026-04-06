import { z } from 'zod';

export const configSchema = z.object({
  port: z.coerce.number().default(4000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

  jwt: z.object({
    secret: z.string().min(16),
    accessExpires: z.string().default('15m'),
    refreshExpires: z.string().default('7d'),
  }),

  db: z.object({
    path: z.string().default('./data/openclaw.db'),
  }),

  gateway: z.object({
    mode: z.enum(['real', 'mock']).default('mock'),
    url: z.string().url().default('http://127.0.0.1:3000'),
    token: z.string().default(''),
    timeout: z.coerce.number().default(10000),
  }),

  cors: z.object({
    origin: z.string().default('http://localhost:5173'),
  }),

  rateLimit: z.object({
    windowMs: z.coerce.number().default(60000),
    max: z.coerce.number().default(100),
  }),

  logLevel: z.string().default('info'),

  adminSeed: z.object({
    username: z.string().default('admin'),
    password: z.string().default('admin123'),
  }),
});

export type AppConfig = z.infer<typeof configSchema>;
