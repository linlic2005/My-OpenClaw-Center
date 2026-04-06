import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('server acceptance checks', () => {
  let baseUrl = '';
  let server: http.Server;
  let closeDatabase: (() => void) | undefined;
  let disconnectGateway: (() => Promise<void>) | undefined;
  let saveDatabase: (() => void) | undefined;
  let getDb: (() => { prepare: (sql: string) => { run: (params?: unknown[]) => void; free: () => void } }) | undefined;
  const dbPath = path.resolve(process.cwd(), 'data', 'acceptance-vitest.db');

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef';
    process.env.JWT_ACCESS_EXPIRES = '15m';
    process.env.JWT_REFRESH_EXPIRES = '7d';
    process.env.DB_PATH = dbPath;
    process.env.GATEWAY_MODE = 'mock';
    process.env.GATEWAY_URL = 'http://127.0.0.1:3000';
    process.env.GATEWAY_TOKEN = 'your-gateway-secret-token';
    process.env.GATEWAY_TIMEOUT = '3000';
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX = '100';
    process.env.LOG_LEVEL = 'error';
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'admin123';

    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    const dbModule = await import('../src/database/connection.ts');
    const migrationsModule = await import('../src/database/migrations.ts');
    const seedModule = await import('../src/database/seed.ts');
    const gatewayModule = await import('../src/gateway/index.ts');
    const appModule = await import('../src/app.ts');

    closeDatabase = dbModule.closeDatabase;
    saveDatabase = dbModule.saveDatabase;
    getDb = dbModule.getDb as typeof getDb;

    await dbModule.initDatabase();
    await migrationsModule.runMigrations();
    await seedModule.seedDatabase();
    await gatewayModule.initGateway();
    disconnectGateway = async () => {
      await gatewayModule.getGateway().disconnect();
    };

    seedViewerUser();

    server = http.createServer(appModule.createApp());
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to resolve test server address');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    if (disconnectGateway) {
      await disconnectGateway();
    }
    closeDatabase?.();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('reports gateway connectivity in health', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.gateway).toEqual({ mode: 'mock', connected: true });
  });

  it('streams chat responses and persists message history', async () => {
    const adminToken = await login('admin', 'admin123');
    const agentsResponse = await request('/api/agents', { token: adminToken });
    const agentsPayload = await agentsResponse.json();
    expect(agentsPayload.data.length).toBeGreaterThan(0);

    const sessionResponse = await request('/api/chat/sessions', {
      method: 'POST',
      token: adminToken,
      body: { agentId: agentsPayload.data[0].id },
    });
    const sessionPayload = await sessionResponse.json();
    const sessionId = sessionPayload.data.id as string;

    const streamResponse = await request(`/api/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      token: adminToken,
      body: { content: 'acceptance test message' },
    });
    const streamText = await streamResponse.text();

    expect(streamResponse.status).toBe(200);
    expect(streamText).toContain('event: chunk');
    expect(streamText).toContain('event: done');

    const historyResponse = await request(`/api/chat/sessions/${sessionId}/messages`, {
      token: adminToken,
    });
    const historyPayload = await historyResponse.json();

    expect(historyPayload.pagination.total).toBe(2);
    expect(historyPayload.data[0].role).toBe('user');
    expect(historyPayload.data[1].role).toBe('assistant');
  });

  it('blocks cross-user chat session access', async () => {
    const adminToken = await login('admin', 'admin123');
    const sessionResponse = await request('/api/chat/sessions', {
      method: 'POST',
      token: adminToken,
      body: { agentId: 'agent-1' },
    });
    const sessionPayload = await sessionResponse.json();

    const viewerToken = await login('viewer', 'viewer123');
    const forbiddenResponse = await request(`/api/chat/sessions/${sessionPayload.data.id}`, {
      token: viewerToken,
    });

    expect(forbiddenResponse.status).toBe(403);
  });

  it('blocks non-admin office anchor updates', async () => {
    const viewerToken = await login('viewer', 'viewer123');
    const response = await request('/api/office/agents/agent-1', {
      method: 'PUT',
      token: viewerToken,
      body: {
        roomId: 'public',
        anchors: {
          idle: { x: 100, y: 100 },
          work: { x: 150, y: 150 },
          sleep: { x: 200, y: 200 },
        },
      },
    });

    expect(response.status).toBe(403);
  });

  async function login(username: string, password: string): Promise<string> {
    const response = await request('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    const payload = await response.json();
    return payload.data.tokens.accessToken as string;
  }

  async function request(
    pathname: string,
    options: {
      method?: string;
      token?: string;
      body?: unknown;
    } = {},
  ): Promise<Response> {
    const headers: Record<string, string> = {};
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    return fetch(`${baseUrl}${pathname}`, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  }

  function seedViewerUser(): void {
    if (!getDb || !saveDatabase) {
      throw new Error('Database helpers not initialized');
    }

    const db = getDb();
    const stmt = db.prepare(
      'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
    );
    stmt.run([
      'viewer-user',
      'viewer',
      bcrypt.hashSync('viewer123', 10),
      'viewer',
    ]);
    stmt.free();
    saveDatabase();
  }
});
