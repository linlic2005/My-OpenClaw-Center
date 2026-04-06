import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { getDb, saveDatabase } from '../../database/connection.js';
import { sendSuccess } from '../../shared/response.js';

const router = Router();

// GET /api/settings
router.get('/', requireAuth, (_req: Request, res: Response) => {
  const db = getDb();
  const stmt = db.prepare('SELECT section, key, value FROM settings');
  const settings: Record<string, Record<string, string>> = {};
  while (stmt.step()) {
    const v = stmt.get();
    const section = v[0] as string;
    if (!settings[section]) settings[section] = {};
    settings[section][v[1] as string] = v[2] as string;
  }
  stmt.free();
  sendSuccess(res, settings);
});

// GET /api/settings/:section
router.get('/:section', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const stmt = db.prepare('SELECT key, value FROM settings WHERE section = ?');
  stmt.bind([req.params.section]);
  const settings: Record<string, string> = {};
  while (stmt.step()) {
    const v = stmt.get();
    settings[v[0] as string] = v[1] as string;
  }
  stmt.free();
  sendSuccess(res, settings);
});

// PUT /api/settings/:section
router.put('/:section', requireAuth, requireRole('admin'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const section = req.params.section;
    const entries = req.body as Record<string, string>;

    for (const [key, value] of Object.entries(entries)) {
      const stmt = db.prepare(
        `INSERT INTO settings (section, key, value) VALUES (?, ?, ?)
         ON CONFLICT(section, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      );
      stmt.run([section, key, String(value)]);
      stmt.free();
    }
    saveDatabase();
    sendSuccess(res, { message: 'Settings updated' });
  } catch (err) {
    next(err);
  }
});

export const settingsController = router;
