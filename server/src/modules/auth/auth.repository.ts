import { getDb } from '../../database/connection.js';
import type { User } from './auth.types.js';

function rowToUser(columns: string[], values: (string | number | null | Uint8Array)[]): User {
  const obj: Record<string, unknown> = {};
  columns.forEach((col, i) => { obj[col] = values[i]; });
  return {
    id: obj['id'] as string,
    username: obj['username'] as string,
    passwordHash: obj['password_hash'] as string,
    role: obj['role'] as User['role'],
    createdAt: obj['created_at'] as string,
    updatedAt: obj['updated_at'] as string,
  };
}

export class AuthRepository {
  findByUsername(username: string): User | null {
    const db = getDb();
    const stmt = db.prepare(
      `SELECT id, username, password_hash, role, created_at, updated_at
       FROM users WHERE username = ?`,
    );
    stmt.bind([username]);
    if (stmt.step()) {
      const columns = stmt.getColumnNames();
      const values = stmt.get();
      stmt.free();
      return rowToUser(columns, values);
    }
    stmt.free();
    return null;
  }

  findById(id: string): User | null {
    const db = getDb();
    const stmt = db.prepare(
      `SELECT id, username, password_hash, role, created_at, updated_at
       FROM users WHERE id = ?`,
    );
    stmt.bind([id]);
    if (stmt.step()) {
      const columns = stmt.getColumnNames();
      const values = stmt.get();
      stmt.free();
      return rowToUser(columns, values);
    }
    stmt.free();
    return null;
  }
}

export const authRepository = new AuthRepository();
