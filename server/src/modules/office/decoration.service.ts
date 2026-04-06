import fs from 'node:fs';
import path from 'node:path';
import { AppError, NotFoundError } from '../../shared/errors.js';
import type { AssetItem, FavoritesIndex, FavoriteItem } from './decoration.types.js';

/* ------------------------------------------------------------------ */
/*  Paths                                                              */
/* ------------------------------------------------------------------ */

const ASSETS_DIR = path.resolve('public/assets/star-office');
const BG_HISTORY_DIR = path.join(ASSETS_DIR, 'bg-history');
const FAVORITES_DIR = path.join(ASSETS_DIR, 'home-favorites');
const FAVORITES_INDEX = path.join(FAVORITES_DIR, 'index.json');
const REFERENCE_IMAGE = path.resolve('assets/room-reference.webp');
const BG_FILE = path.join(ASSETS_DIR, 'office_bg_small.webp');
const ALLOWED_EXTS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.gif']);
const MAX_FAVORITES = 20;

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */

// In-memory session set (simple approach, fine for single-process)
const authedSessions = new Set<string>();

function getDrawerPass(): string {
  return process.env.DECORATION_DRAWER_PASS || '1234';
}

export class DecorationService {
  /* ---------- Auth ---------- */

  authenticate(password: string, sessionId: string): boolean {
    if (password === getDrawerPass()) {
      authedSessions.add(sessionId);
      return true;
    }
    return false;
  }

  isAuthenticated(sessionId: string): boolean {
    return authedSessions.has(sessionId);
  }

  requireAuth(sessionId: string): void {
    if (!this.isAuthenticated(sessionId)) {
      throw new AppError('DECORATION_AUTH_REQUIRED', '请先输入验证码', 401);
    }
  }

  /* ---------- Asset listing ---------- */

  listAssets(): AssetItem[] {
    if (!fs.existsSync(ASSETS_DIR)) return [];

    const items: AssetItem[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'fonts' || entry.name === 'bg-history' || entry.name === 'home-favorites') continue;
          walk(full);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (!ALLOWED_EXTS.has(ext)) continue;
          const stat = fs.statSync(full);
          items.push({
            path: path.relative(ASSETS_DIR, full).replace(/\\/g, '/'),
            size: stat.size,
            ext,
            mtime: stat.mtime.toISOString(),
          });
        }
      }
    };
    walk(ASSETS_DIR);
    items.sort((a, b) => a.path.localeCompare(b.path));
    return items;
  }

  /* ---------- Upload & replace ---------- */

  uploadAsset(relPath: string, fileBuffer: Buffer): { path: string; size: number } {
    const target = path.resolve(ASSETS_DIR, relPath);
    // Security: ensure target is under ASSETS_DIR
    if (!target.startsWith(ASSETS_DIR)) {
      throw new AppError('INVALID_PATH', '非法路径', 400);
    }
    if (!fs.existsSync(target)) {
      throw new NotFoundError('asset', relPath);
    }

    const ext = path.extname(target).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) {
      throw new AppError('INVALID_EXT', '不支持的文件类型', 400);
    }

    // First-time snapshot for restore-default
    const defaultSnap = target + '.default';
    if (!fs.existsSync(defaultSnap)) {
      fs.copyFileSync(target, defaultSnap);
    }

    // Backup current version
    const bak = target + '.bak';
    fs.copyFileSync(target, bak);

    // Write new file
    fs.writeFileSync(target, fileBuffer);
    const stat = fs.statSync(target);
    return { path: relPath, size: stat.size };
  }

  /* ---------- Restore default ---------- */

  restoreDefault(relPath: string): { path: string; size: number } {
    const target = path.resolve(ASSETS_DIR, relPath);
    if (!target.startsWith(ASSETS_DIR)) {
      throw new AppError('INVALID_PATH', '非法路径', 400);
    }

    const defaultSnap = target + '.default';
    if (!fs.existsSync(defaultSnap)) {
      throw new NotFoundError('default-snapshot', relPath);
    }

    // Backup current before restoring
    if (fs.existsSync(target)) {
      fs.copyFileSync(target, target + '.bak');
    }

    fs.copyFileSync(defaultSnap, target);
    const stat = fs.statSync(target);
    return { path: relPath, size: stat.size };
  }

  /* ---------- Restore previous ---------- */

  restorePrevious(relPath: string): { path: string; size: number } {
    const target = path.resolve(ASSETS_DIR, relPath);
    if (!target.startsWith(ASSETS_DIR)) {
      throw new AppError('INVALID_PATH', '非法路径', 400);
    }

    const bak = target + '.bak';
    if (!fs.existsSync(bak)) {
      throw new NotFoundError('backup', relPath);
    }

    fs.copyFileSync(bak, target);
    const stat = fs.statSync(target);
    return { path: relPath, size: stat.size };
  }

  /* ---------- Background upload (for web-generated images) ---------- */

  uploadBackground(fileBuffer: Buffer): { path: string; size: number; history?: string } {
    if (!fs.existsSync(BG_FILE)) {
      throw new NotFoundError('background', 'office_bg_small.webp');
    }

    // Backup current
    fs.copyFileSync(BG_FILE, BG_FILE + '.bak');

    // Write new
    fs.writeFileSync(BG_FILE, fileBuffer);

    // Archive to history
    fs.mkdirSync(BG_HISTORY_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const histFile = path.join(BG_HISTORY_DIR, `office_bg_small-${ts}.webp`);
    fs.copyFileSync(BG_FILE, histFile);

    const stat = fs.statSync(BG_FILE);
    return {
      path: 'office_bg_small.webp',
      size: stat.size,
      history: path.relative(ASSETS_DIR, histFile).replace(/\\/g, '/'),
    };
  }

  /* ---------- Restore reference background ---------- */

  restoreReferenceBackground(): { path: string; size: number } {
    if (!fs.existsSync(REFERENCE_IMAGE)) {
      throw new NotFoundError('reference-image', 'room-reference.webp');
    }
    if (!fs.existsSync(BG_FILE)) {
      throw new NotFoundError('background', 'office_bg_small.webp');
    }

    fs.copyFileSync(BG_FILE, BG_FILE + '.bak');
    fs.copyFileSync(REFERENCE_IMAGE, BG_FILE);
    const stat = fs.statSync(BG_FILE);
    return { path: 'office_bg_small.webp', size: stat.size };
  }

  /* ---------- Reference template download path ---------- */

  getReferenceImagePath(): string | null {
    if (fs.existsSync(REFERENCE_IMAGE)) return REFERENCE_IMAGE;
    // Try fallback in assets dir
    const alt = path.join(ASSETS_DIR, '..', '..', 'assets', 'room-reference.webp');
    if (fs.existsSync(alt)) return alt;
    return null;
  }

  /* ---------- Favorites ---------- */

  private loadFavoritesIndex(): FavoritesIndex {
    fs.mkdirSync(FAVORITES_DIR, { recursive: true });
    if (!fs.existsSync(FAVORITES_INDEX)) return { items: [] };
    try {
      return JSON.parse(fs.readFileSync(FAVORITES_INDEX, 'utf-8'));
    } catch {
      return { items: [] };
    }
  }

  private saveFavoritesIndex(idx: FavoritesIndex): void {
    fs.mkdirSync(FAVORITES_DIR, { recursive: true });
    fs.writeFileSync(FAVORITES_INDEX, JSON.stringify(idx, null, 2));
  }

  listFavorites(): FavoriteItem[] {
    return this.loadFavoritesIndex().items;
  }

  saveFavorite(): FavoriteItem {
    if (!fs.existsSync(BG_FILE)) {
      throw new NotFoundError('background', 'office_bg_small.webp');
    }

    fs.mkdirSync(FAVORITES_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const id = `home-${ts}`;
    const fn = `${id}.webp`;
    const dst = path.join(FAVORITES_DIR, fn);
    fs.copyFileSync(BG_FILE, dst);

    const idx = this.loadFavoritesIndex();
    const item: FavoriteItem = {
      id,
      path: path.relative(ASSETS_DIR, dst).replace(/\\/g, '/'),
      createdAt: new Date().toISOString(),
    };
    idx.items.unshift(item);

    // Enforce max
    if (idx.items.length > MAX_FAVORITES) {
      const extra = idx.items.splice(MAX_FAVORITES);
      for (const it of extra) {
        const p = path.resolve(ASSETS_DIR, it.path);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    }

    this.saveFavoritesIndex(idx);
    return item;
  }

  deleteFavorite(id: string): void {
    const idx = this.loadFavoritesIndex();
    const hit = idx.items.find((x) => x.id === id);
    if (!hit) throw new NotFoundError('favorite', id);

    const abs = path.resolve(ASSETS_DIR, hit.path);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);

    idx.items = idx.items.filter((x) => x.id !== id);
    this.saveFavoritesIndex(idx);
  }

  applyFavorite(id: string): { path: string; size: number } {
    const idx = this.loadFavoritesIndex();
    const hit = idx.items.find((x) => x.id === id);
    if (!hit) throw new NotFoundError('favorite', id);

    const src = path.resolve(ASSETS_DIR, hit.path);
    if (!fs.existsSync(src)) throw new NotFoundError('favorite-file', id);
    if (!fs.existsSync(BG_FILE)) throw new NotFoundError('background', 'office_bg_small.webp');

    fs.copyFileSync(BG_FILE, BG_FILE + '.bak');
    fs.copyFileSync(src, BG_FILE);
    const stat = fs.statSync(BG_FILE);
    return { path: 'office_bg_small.webp', size: stat.size };
  }
}

export const decorationService = new DecorationService();
