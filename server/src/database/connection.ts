import initSqlJs, { type Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import { logger } from '../shared/logger.js';

let db: Database;

export async function initDatabase(): Promise<Database> {
  const SQL = await initSqlJs();

  const dbDir = path.dirname(config.db.path);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(config.db.path)) {
    const buffer = fs.readFileSync(config.db.path);
    db = new SQL.Database(buffer);
    logger.info(`Database loaded from ${config.db.path}`);
  } else {
    db = new SQL.Database();
    logger.info('New database created');
  }

  // Enable WAL mode equivalent and foreign keys
  db.run('PRAGMA foreign_keys = ON');

  return db;
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function saveDatabase(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(config.db.path, buffer);
}

// Auto-save periodically in production
let saveInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoSave(intervalMs = 30000): void {
  if (saveInterval) return;
  saveInterval = setInterval(() => {
    try {
      saveDatabase();
    } catch (err) {
      logger.error(err, 'Failed to auto-save database');
    }
  }, intervalMs);
}

export function stopAutoSave(): void {
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }
}

export function closeDatabase(): void {
  stopAutoSave();
  if (db) {
    saveDatabase();
    db.close();
    logger.info('Database closed');
  }
}
