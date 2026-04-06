import { v4 as uuidv4 } from 'uuid';
import { getDb, saveDatabase } from '../database/connection.js';
import { logger } from '../shared/logger.js';

export interface AuditEntry {
  userId?: string;
  username?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  traceId?: string;
  ipAddress?: string;
}

export function writeAuditLog(entry: AuditEntry): void {
  try {
    const db = getDb();
    const stmt = db.prepare(
      `INSERT INTO audit_logs (id, user_id, username, action, resource, resource_id, details, trace_id, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    stmt.run([
      uuidv4(),
      entry.userId || null,
      entry.username || null,
      entry.action,
      entry.resource,
      entry.resourceId || null,
      entry.details || null,
      entry.traceId || null,
      entry.ipAddress || null,
    ]);
    stmt.free();
    saveDatabase();
  } catch (err) {
    logger.error(err, 'Failed to write audit log');
  }
}

export function queryAuditLogs(opts: { limit?: number; offset?: number; action?: string; resource?: string }): AuditEntry[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number | null)[] = [];

  if (opts.action) { conditions.push('action = ?'); params.push(opts.action); }
  if (opts.resource) { conditions.push('resource = ?'); params.push(opts.resource); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = opts.limit || 50;
  const offset = opts.offset || 0;
  params.push(limit, offset);

  const stmt = db.prepare(
    `SELECT id, user_id, username, action, resource, resource_id, details, trace_id, ip_address, created_at
     FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  );
  stmt.bind(params);
  const logs: any[] = [];
  while (stmt.step()) {
    const v = stmt.get();
    logs.push({
      id: v[0], userId: v[1], username: v[2], action: v[3],
      resource: v[4], resourceId: v[5], details: v[6],
      traceId: v[7], ipAddress: v[8], createdAt: v[9],
    });
  }
  stmt.free();
  return logs;
}
