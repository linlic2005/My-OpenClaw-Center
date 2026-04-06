import { getDb, saveDatabase } from './connection.js';
import { logger } from '../shared/logger.js';

const migrations: { version: number; name: string; sql: string }[] = [
  {
    version: 1,
    name: 'create_users_table',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin', 'viewer')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `,
  },
  {
    version: 2,
    name: 'create_sessions_and_messages',
    sql: `
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'New Conversation',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        agent_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
    `,
  },
  {
    version: 3,
    name: 'create_office_tables',
    sql: `
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        background TEXT NOT NULL DEFAULT '/assets/office-bg.png',
        type TEXT NOT NULL CHECK(type IN ('public', 'private')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS agent_anchors (
        agent_id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL REFERENCES rooms(id),
        idle_x REAL NOT NULL,
        idle_y REAL NOT NULL,
        work_x REAL NOT NULL,
        work_y REAL NOT NULL,
        sleep_x REAL NOT NULL,
        sleep_y REAL NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `,
  },
  {
    version: 4,
    name: 'create_audit_logs',
    sql: `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        username TEXT,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        resource_id TEXT,
        details TEXT,
        trace_id TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
    `,
  },
  {
    version: 5,
    name: 'create_settings_table',
    sql: `
      CREATE TABLE IF NOT EXISTS settings (
        section TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (section, key)
      );
    `,
  },
  {
    version: 6,
    name: 'add_furniture_to_rooms',
    sql: `
      ALTER TABLE rooms ADD COLUMN furniture TEXT;
    `,
  },
];

export async function runMigrations(): Promise<void> {
  const db = getDb();

  // Ensure migrations table exists
  db.run(`CREATE TABLE IF NOT EXISTS migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  const applied = new Set<number>();
  const rows = db.exec('SELECT version FROM migrations');
  if (rows.length > 0) {
    for (const row of rows[0].values) {
      applied.add(row[0] as number);
    }
  }

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;

    logger.info(`Running migration ${migration.version}: ${migration.name}`);
    db.run(migration.sql);
    db.run(
      'INSERT INTO migrations (version, name) VALUES (?, ?)',
      [migration.version, migration.name],
    );
  }

  saveDatabase();
  logger.info('Migrations complete');
}
