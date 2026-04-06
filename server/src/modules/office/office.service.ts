import { getDb, saveDatabase } from '../../database/connection.js';
import { ConflictError, NotFoundError } from '../../shared/errors.js';
import type { RoomDTO, AgentAnchorDTO } from './office.types.js';

export class OfficeService {
  listRooms(): RoomDTO[] {
    const db = getDb();
    const stmt = db.prepare('SELECT id, name, background, type, furniture FROM rooms');
    const rooms: RoomDTO[] = [];
    while (stmt.step()) {
      const v = stmt.get();
      rooms.push({ 
        id: v[0] as string, 
        name: v[1] as string, 
        background: v[2] as string, 
        type: v[3] as RoomDTO['type'],
        furniture: v[4] ? JSON.parse(v[4] as string) : undefined
      });
    }
    stmt.free();
    return rooms;
  }

  createRoom(room: RoomDTO): RoomDTO {
    const db = getDb();
    const existingStmt = db.prepare('SELECT id FROM rooms WHERE id = ?');
    existingStmt.bind([room.id]);
    const exists = existingStmt.step();
    existingStmt.free();
    if (exists) {
      throw new ConflictError(`Room '${room.id}' already exists`);
    }

    const stmt = db.prepare('INSERT INTO rooms (id, name, background, type, furniture) VALUES (?, ?, ?, ?, ?)');
    stmt.run([room.id, room.name, room.background, room.type, room.furniture ? JSON.stringify(room.furniture) : null]);
    stmt.free();
    saveDatabase();
    return room;
  }

  updateRoom(id: string, updates: Partial<RoomDTO>): void {
    const db = getDb();
    const checkStmt = db.prepare('SELECT id FROM rooms WHERE id = ?');
    checkStmt.bind([id]);
    const exists = checkStmt.step();
    checkStmt.free();
    if (!exists) {
      throw new NotFoundError('room', id);
    }

    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    if (updates.name) { sets.push('name = ?'); vals.push(updates.name); }
    if (updates.background) { sets.push('background = ?'); vals.push(updates.background); }
    if (updates.type) { sets.push('type = ?'); vals.push(updates.type); }
    if (updates.furniture !== undefined) { sets.push('furniture = ?'); vals.push(JSON.stringify(updates.furniture)); }
    if (sets.length === 0) return;
    sets.push("updated_at = datetime('now')");
    vals.push(id);
    const stmt = db.prepare(`UPDATE rooms SET ${sets.join(', ')} WHERE id = ?`);
    stmt.run(vals);
    stmt.free();
    saveDatabase();
  }

  deleteRoom(id: string): void {
    const db = getDb();
    if (id === 'public') {
      throw new ConflictError('The default public room cannot be deleted');
    }

    const checkStmt = db.prepare('SELECT id FROM rooms WHERE id = ?');
    checkStmt.bind([id]);
    const exists = checkStmt.step();
    checkStmt.free();
    if (!exists) {
      throw new NotFoundError('room', id);
    }

    const occupancyStmt = db.prepare('SELECT COUNT(*) FROM agent_anchors WHERE room_id = ?');
    occupancyStmt.bind([id]);
    occupancyStmt.step();
    const occupiedCount = Number(occupancyStmt.get()[0] || 0);
    occupancyStmt.free();
    if (occupiedCount > 0) {
      throw new ConflictError(`Room '${id}' still has ${occupiedCount} assigned agent(s)`);
    }

    const stmt = db.prepare('DELETE FROM rooms WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    saveDatabase();
  }

  listAgentAnchors(): AgentAnchorDTO[] {
    const db = getDb();
    const stmt = db.prepare('SELECT agent_id, room_id, idle_x, idle_y, work_x, work_y, sleep_x, sleep_y FROM agent_anchors');
    const anchors: AgentAnchorDTO[] = [];
    while (stmt.step()) {
      const v = stmt.get();
      anchors.push({
        agentId: v[0] as string,
        roomId: v[1] as string,
        anchors: {
          idle: { x: v[2] as number, y: v[3] as number },
          work: { x: v[4] as number, y: v[5] as number },
          sleep: { x: v[6] as number, y: v[7] as number },
        },
      });
    }
    stmt.free();
    return anchors;
  }

  upsertAgentAnchor(agentId: string, roomId: string, anchors: AgentAnchorDTO['anchors']): void {
    const db = getDb();
    const stmt = db.prepare(
      `INSERT INTO agent_anchors (agent_id, room_id, idle_x, idle_y, work_x, work_y, sleep_x, sleep_y)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(agent_id) DO UPDATE SET
         room_id = excluded.room_id,
         idle_x = excluded.idle_x, idle_y = excluded.idle_y,
         work_x = excluded.work_x, work_y = excluded.work_y,
         sleep_x = excluded.sleep_x, sleep_y = excluded.sleep_y,
         updated_at = datetime('now')`,
    );
    stmt.run([agentId, roomId, anchors.idle.x, anchors.idle.y, anchors.work.x, anchors.work.y, anchors.sleep.x, anchors.sleep.y]);
    stmt.free();
    saveDatabase();
  }
}

export const officeService = new OfficeService();
