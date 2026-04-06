import { v4 as uuidv4 } from 'uuid';
import { getDb, saveDatabase } from '../../database/connection.js';
import type { SessionDTO, MessageDTO } from './chat.types.js';

export class ChatRepository {
  createSession(agentId: string, userId: string, title: string): SessionDTO {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(
      'INSERT INTO chat_sessions (id, agent_id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    );
    stmt.run([id, agentId, userId, title, now, now]);
    stmt.free();
    saveDatabase();
    return { id, agentId, userId, title, updatedAt: now };
  }

  listSessions(userId: string): SessionDTO[] {
    const db = getDb();
    const stmt = db.prepare(
      `SELECT s.id, s.agent_id, s.user_id, s.title, s.updated_at,
              (SELECT m.content FROM messages m WHERE m.session_id = s.id ORDER BY m.created_at DESC LIMIT 1) as last_message
       FROM chat_sessions s
       WHERE s.user_id = ?
       ORDER BY s.updated_at DESC`,
    );
    stmt.bind([userId]);
    const sessions: SessionDTO[] = [];
    while (stmt.step()) {
      const vals = stmt.get();
      sessions.push({
        id: vals[0] as string,
        agentId: vals[1] as string,
        userId: vals[2] as string,
        title: vals[3] as string,
        updatedAt: vals[4] as string,
        lastMessage: vals[5] as string | undefined,
      });
    }
    stmt.free();
    return sessions;
  }

  getSession(sessionId: string): SessionDTO | null {
    const db = getDb();
    const stmt = db.prepare(
      'SELECT id, agent_id, user_id, title, updated_at FROM chat_sessions WHERE id = ?',
    );
    stmt.bind([sessionId]);
    if (!stmt.step()) { stmt.free(); return null; }
    const vals = stmt.get();
    stmt.free();

    const messages = this.getMessages(sessionId);

    return {
      id: vals[0] as string,
      agentId: vals[1] as string,
      userId: vals[2] as string,
      title: vals[3] as string,
      updatedAt: vals[4] as string,
      messages,
    };
  }

  deleteSession(sessionId: string): void {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM chat_sessions WHERE id = ?');
    stmt.run([sessionId]);
    stmt.free();
    saveDatabase();
  }

  addMessage(sessionId: string, role: MessageDTO['role'], content: string, agentId?: string): MessageDTO {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(
      'INSERT INTO messages (id, session_id, role, content, agent_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    );
    stmt.run([id, sessionId, role, content, agentId || null, now]);
    stmt.free();

    // Update session timestamp
    const upd = db.prepare('UPDATE chat_sessions SET updated_at = ? WHERE id = ?');
    upd.run([now, sessionId]);
    upd.free();

    saveDatabase();
    return { id, role, content, agentId, timestamp: now };
  }

  getMessages(sessionId: string, limit = 100, offset = 0): MessageDTO[] {
    const db = getDb();
    const stmt = db.prepare(
      `SELECT id, role, content, agent_id, created_at
       FROM messages WHERE session_id = ?
       ORDER BY created_at ASC
       LIMIT ? OFFSET ?`,
    );
    stmt.bind([sessionId, limit, offset]);
    const messages: MessageDTO[] = [];
    while (stmt.step()) {
      const vals = stmt.get();
      messages.push({
        id: vals[0] as string,
        role: vals[1] as MessageDTO['role'],
        content: vals[2] as string,
        agentId: vals[3] as string | undefined,
        timestamp: vals[4] as string,
      });
    }
    stmt.free();
    return messages;
  }

  countMessages(sessionId: string): number {
    const db = getDb();
    const stmt = db.prepare('SELECT COUNT(*) FROM messages WHERE session_id = ?');
    stmt.bind([sessionId]);
    stmt.step();
    const count = stmt.get()[0] as number;
    stmt.free();
    return count;
  }
}

export const chatRepository = new ChatRepository();
