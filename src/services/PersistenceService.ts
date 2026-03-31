import type { ErrorLogRecord } from "../types";

type ErrorLogLevel = "info" | "warn" | "error";

interface SqlDatabaseLike {
  execute(query: string, bindValues?: unknown[]): Promise<unknown>;
  select<T>(query: string, bindValues?: unknown[]): Promise<T[]>;
}

const KV_TABLE = "app_kv";
const ERROR_TABLE = "error_logs";
const LOCAL_PREFIX = "openclaw.persist";

function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);
}

class PersistenceService {
  private db: SqlDatabaseLike | null = null;
  private initPromise: Promise<void> | null = null;

  private async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    return this.initPromise;
  }

  private async initialize(): Promise<void> {
    if (!isTauriRuntime()) return;

    try {
      const sqlModule = await import("@tauri-apps/plugin-sql");
      const Database = sqlModule.default;
      this.db = await Database.load("sqlite:openclaw-center.db");
      await this.db.execute(
        `CREATE TABLE IF NOT EXISTS ${KV_TABLE} (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )`
      );
      await this.db.execute(
        `CREATE TABLE IF NOT EXISTS ${ERROR_TABLE} (
          id TEXT PRIMARY KEY,
          timestamp INTEGER NOT NULL,
          level TEXT NOT NULL,
          module TEXT NOT NULL,
          message TEXT NOT NULL,
          stack TEXT,
          context TEXT
        )`
      );
    } catch (error) {
      console.warn("PersistenceService fell back to localStorage", error);
      this.db = null;
    }
  }

  private localKey(key: string): string {
    return `${LOCAL_PREFIX}.${key}`;
  }

  async getJson<T>(key: string, fallback: T): Promise<T> {
    await this.ensureInitialized();

    try {
      if (this.db) {
        const rows = await this.db.select<{ value: string }>(
          `SELECT value FROM ${KV_TABLE} WHERE key = ? LIMIT 1`,
          [key]
        );
        if (!rows.length) return fallback;
        return JSON.parse(rows[0].value) as T;
      }

      const raw = window.localStorage.getItem(this.localKey(key));
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  async setJson<T>(key: string, value: T): Promise<void> {
    await this.ensureInitialized();
    const encoded = JSON.stringify(value);

    if (this.db) {
      await this.db.execute(
        `INSERT INTO ${KV_TABLE} (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`,
        [key, encoded, Date.now()]
      );
      return;
    }

    window.localStorage.setItem(this.localKey(key), encoded);
  }

  async remove(key: string): Promise<void> {
    await this.ensureInitialized();

    if (this.db) {
      await this.db.execute(`DELETE FROM ${KV_TABLE} WHERE key = ?`, [key]);
      return;
    }

    window.localStorage.removeItem(this.localKey(key));
  }

  async logError(
    module: string,
    error: unknown,
    context?: Record<string, unknown>,
    level: ErrorLogLevel = "error"
  ): Promise<void> {
    await this.ensureInitialized();

    const record: ErrorLogRecord = {
      id: createId("log"),
      timestamp: Date.now(),
      level,
      module,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: context ? JSON.stringify(context) : undefined
    };

    if (this.db) {
      await this.db.execute(
        `INSERT INTO ${ERROR_TABLE} (id, timestamp, level, module, message, stack, context)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.timestamp,
          record.level,
          record.module,
          record.message,
          record.stack ?? null,
          record.context ?? null
        ]
      );
      return;
    }

    const key = this.localKey(ERROR_TABLE);
    const raw = window.localStorage.getItem(key);
    const items = raw ? ((JSON.parse(raw) as ErrorLogRecord[]) ?? []) : [];
    items.unshift(record);
    window.localStorage.setItem(key, JSON.stringify(items.slice(0, 200)));
  }

  async listErrorLogs(limit = 100): Promise<ErrorLogRecord[]> {
    await this.ensureInitialized();

    if (this.db) {
      return this.db.select<ErrorLogRecord>(
        `SELECT id, timestamp, level, module, message, stack, context
         FROM ${ERROR_TABLE}
         ORDER BY timestamp DESC
         LIMIT ?`,
        [limit]
      );
    }

    const raw = window.localStorage.getItem(this.localKey(ERROR_TABLE));
    const items = raw ? ((JSON.parse(raw) as ErrorLogRecord[]) ?? []) : [];
    return items.slice(0, limit);
  }

  async clearErrorLogs(): Promise<void> {
    await this.ensureInitialized();

    if (this.db) {
      await this.db.execute(`DELETE FROM ${ERROR_TABLE}`);
      return;
    }

    window.localStorage.removeItem(this.localKey(ERROR_TABLE));
  }
}

export const persistenceService = new PersistenceService();
