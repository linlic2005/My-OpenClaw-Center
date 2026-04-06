import 'dotenv/config';
import { configSchema, type AppConfig } from './schema.js';

function loadConfig(): AppConfig {
  const raw = {
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    jwt: {
      secret: process.env.JWT_SECRET,
      accessExpires: process.env.JWT_ACCESS_EXPIRES,
      refreshExpires: process.env.JWT_REFRESH_EXPIRES,
    },
    db: {
      path: process.env.DB_PATH,
    },
    gateway: {
      mode: process.env.GATEWAY_MODE,
      url: process.env.GATEWAY_URL,
      token: process.env.GATEWAY_TOKEN,
      timeout: process.env.GATEWAY_TIMEOUT,
    },
    cors: {
      origin: process.env.CORS_ORIGIN,
    },
    rateLimit: {
      windowMs: process.env.RATE_LIMIT_WINDOW_MS,
      max: process.env.RATE_LIMIT_MAX,
    },
    logLevel: process.env.LOG_LEVEL,
    adminSeed: {
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
    },
  };

  const result = configSchema.safeParse(raw);
  if (!result.success) {
    console.error('Invalid configuration:', result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
export type { AppConfig };
