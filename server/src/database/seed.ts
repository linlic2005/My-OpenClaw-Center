import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { getDb, saveDatabase } from './connection.js';
import { config } from '../config/index.js';
import { logger } from '../shared/logger.js';

export async function seedDatabase(): Promise<void> {
  const db = getDb();

  // Seed admin user if not exists
  const stmt = db.prepare('SELECT id FROM users WHERE username = ?');
  stmt.bind([config.adminSeed.username]);
  const userExists = stmt.step();
  stmt.free();

  if (!userExists) {
    const hash = bcrypt.hashSync(config.adminSeed.password, 10);
    const ins = db.prepare(
      'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
    );
    ins.run([uuidv4(), config.adminSeed.username, hash, 'admin']);
    ins.free();
    logger.info(`Admin user '${config.adminSeed.username}' created`);
  }

  // Seed default rooms
  const roomStmt = db.prepare('SELECT id FROM rooms LIMIT 1');
  const roomsExist = roomStmt.step();
  roomStmt.free();

  if (!roomsExist) {
    db.run(
      `INSERT INTO rooms (id, name, background, type) VALUES
       ('public', '公共大办公室', '/assets/office-bg.png', 'public'),
       ('agent-3-office', '首席架构师专属室', '/assets/office-bg.png', 'private')`,
    );

    db.run(
      `INSERT INTO agent_anchors (agent_id, room_id, idle_x, idle_y, work_x, work_y, sleep_x, sleep_y) VALUES
       ('agent-1', 'public', 1200, 550, 650, 500, 1720, 520),
       ('agent-2', 'public', 1350, 600, 750, 550, 1650, 480),
       ('agent-3', 'agent-3-office', 1000, 600, 960, 540, 1780, 620)`,
    );

    logger.info('Default rooms and agent anchors seeded');
  }

  saveDatabase();
}
