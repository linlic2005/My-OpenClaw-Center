import http from 'http';
import { config } from './config/index.js';
import { logger } from './shared/logger.js';
import { createApp } from './app.js';
import { initDatabase, closeDatabase, startAutoSave } from './database/connection.js';
import { runMigrations } from './database/migrations.js';
import { seedDatabase } from './database/seed.js';
import { initGateway } from './gateway/index.js';
import { setupWebSocket } from './realtime/ws-server.js';
import { eventBus } from './realtime/event-bus.js';

async function bootstrap() {
  // 1. Database
  await initDatabase();
  await runMigrations();
  await seedDatabase();
  startAutoSave();

  // 2. Gateway adapter
  const gateway = await initGateway();

  // 3. Bridge Gateway events → Event Bus
  gateway.onEvent((event) => {
    if (event.type.startsWith('agent.')) {
      eventBus.emit('agents', { type: event.type, data: event.data });
    }
    if (event.type.startsWith('office.')) {
      eventBus.emit('office', { type: event.type, data: event.data });
    }
  });

  // 4. Express + HTTP Server
  const app = createApp();
  const server = http.createServer(app);

  // 5. WebSocket
  setupWebSocket(server);

  server.listen(config.port, () => {
    logger.info(`OpenClaw Server running on port ${config.port} [${config.nodeEnv}]`);
  });

  // 6. Graceful shutdown
  function shutdown(signal: string) {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      closeDatabase();
      logger.info('Server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error(err, 'Failed to start server');
  process.exit(1);
});
