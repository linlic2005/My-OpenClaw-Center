import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { officeService } from './office.service.js';
import { decorationService } from './decoration.service.js';
import { validate } from '../../shared/validator.js';
import { sendSuccess, sendError } from '../../shared/response.js';
import { createRoomSchema, updateAnchorSchema } from './office.types.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/* ================================================================== */
/*  Rooms & Anchors (existing)                                         */
/* ================================================================== */

router.get('/rooms', requireAuth, (_req: Request, res: Response) => {
  sendSuccess(res, officeService.listRooms());
});

router.post('/rooms', requireAuth, requireRole('admin'), validate(createRoomSchema), (req: Request, res: Response, next: NextFunction) => {
  try {
    const room = officeService.createRoom(req.body);
    sendSuccess(res, room, 201);
  } catch (err) { next(err); }
});

router.patch('/rooms/:id', requireAuth, requireRole('admin'), (req: Request, res: Response, next: NextFunction) => {
  try {
    officeService.updateRoom(req.params.id, req.body);
    sendSuccess(res, { message: 'Room updated' });
  } catch (err) { next(err); }
});

router.delete('/rooms/:id', requireAuth, requireRole('admin'), (req: Request, res: Response, next: NextFunction) => {
  try {
    officeService.deleteRoom(req.params.id);
    sendSuccess(res, { message: 'Room deleted' });
  } catch (err) { next(err); }
});

router.get('/agents', requireAuth, (_req: Request, res: Response) => {
  sendSuccess(res, officeService.listAgentAnchors());
});

router.put('/agents/:agentId', requireAuth, requireRole('admin'), validate(updateAnchorSchema), (req: Request, res: Response, next: NextFunction) => {
  try {
    officeService.upsertAgentAnchor(req.params.agentId, req.body.roomId, req.body.anchors);
    sendSuccess(res, { message: 'Anchor updated' });
  } catch (err) { next(err); }
});

/* ================================================================== */
/*  Decoration — Auth                                                  */
/* ================================================================== */

function getSessionId(req: Request): string {
  return (req.headers['x-decoration-session'] as string) || 'default';
}

router.post('/decoration/auth', (req: Request, res: Response) => {
  const { password } = req.body || {};
  if (!password) return sendError(res, 'MISSING_PASSWORD', '请提供验证码', 400);
  const ok = decorationService.authenticate(password, getSessionId(req));
  if (ok) return sendSuccess(res, { authed: true });
  return sendError(res, 'INVALID_PASSWORD', '验证码错误', 401);
});

router.get('/decoration/auth/status', (req: Request, res: Response) => {
  sendSuccess(res, { authed: decorationService.isAuthenticated(getSessionId(req)) });
});

/* ================================================================== */
/*  Decoration — Assets                                                */
/* ================================================================== */

router.get('/decoration/assets', (req: Request, res: Response, next: NextFunction) => {
  try {
    decorationService.requireAuth(getSessionId(req));
    sendSuccess(res, decorationService.listAssets());
  } catch (err) { next(err); }
});

router.post('/decoration/assets/upload', upload.single('file'), (req: Request, res: Response, next: NextFunction) => {
  try {
    decorationService.requireAuth(getSessionId(req));
    const relPath = (req.body.path || '').trim();
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!relPath || !file) return sendError(res, 'MISSING_FIELDS', '缺少 path 或 file', 400);
    const result = decorationService.uploadAsset(relPath, file.buffer);
    sendSuccess(res, { ...result, msg: '素材已替换' });
  } catch (err) { next(err); }
});

router.post('/decoration/assets/restore-default', (req: Request, res: Response, next: NextFunction) => {
  try {
    decorationService.requireAuth(getSessionId(req));
    const relPath = (req.body.path || '').trim();
    if (!relPath) return sendError(res, 'MISSING_PATH', '缺少 path', 400);
    const result = decorationService.restoreDefault(relPath);
    sendSuccess(res, { ...result, msg: '已重置为默认资产' });
  } catch (err) { next(err); }
});

router.post('/decoration/assets/restore-prev', (req: Request, res: Response, next: NextFunction) => {
  try {
    decorationService.requireAuth(getSessionId(req));
    const relPath = (req.body.path || '').trim();
    if (!relPath) return sendError(res, 'MISSING_PATH', '缺少 path', 400);
    const result = decorationService.restorePrevious(relPath);
    sendSuccess(res, { ...result, msg: '已回退到上一版' });
  } catch (err) { next(err); }
});

/* ================================================================== */
/*  Decoration — Background Upload (for Web-generated images)          */
/* ================================================================== */

router.post('/decoration/background/upload', upload.single('file'), (req: Request, res: Response, next: NextFunction) => {
  try {
    decorationService.requireAuth(getSessionId(req));
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return sendError(res, 'MISSING_FILE', '缺少上传文件', 400);
    const result = decorationService.uploadBackground(file.buffer);
    sendSuccess(res, { ...result, msg: '背景已替换' });
  } catch (err) { next(err); }
});

router.post('/decoration/restore-reference-bg', (req: Request, res: Response, next: NextFunction) => {
  try {
    decorationService.requireAuth(getSessionId(req));
    const result = decorationService.restoreReferenceBackground();
    sendSuccess(res, { ...result, msg: '已恢复初始底图' });
  } catch (err) { next(err); }
});

/* ================================================================== */
/*  Decoration — Reference template download                           */
/* ================================================================== */

router.get('/decoration/template', (req: Request, res: Response, next: NextFunction) => {
  try {
    decorationService.requireAuth(getSessionId(req));
    const refPath = decorationService.getReferenceImagePath();
    if (!refPath) return sendError(res, 'NOT_FOUND', '参考图不存在', 404);
    res.sendFile(refPath);
  } catch (err) { next(err); }
});

/* ================================================================== */
/*  Decoration — Favorites                                             */
/* ================================================================== */

router.get('/decoration/favorites', (req: Request, res: Response, next: NextFunction) => {
  try {
    decorationService.requireAuth(getSessionId(req));
    sendSuccess(res, decorationService.listFavorites());
  } catch (err) { next(err); }
});

router.post('/decoration/favorites', (req: Request, res: Response, next: NextFunction) => {
  try {
    decorationService.requireAuth(getSessionId(req));
    const item = decorationService.saveFavorite();
    sendSuccess(res, { ...item, msg: '已收藏当前地图' }, 201);
  } catch (err) { next(err); }
});

router.delete('/decoration/favorites', (req: Request, res: Response, next: NextFunction) => {
  try {
    decorationService.requireAuth(getSessionId(req));
    const { id } = req.body || {};
    if (!id) return sendError(res, 'MISSING_ID', '缺少 id', 400);
    decorationService.deleteFavorite(id);
    sendSuccess(res, { msg: '已删除收藏' });
  } catch (err) { next(err); }
});

router.post('/decoration/favorites/apply', (req: Request, res: Response, next: NextFunction) => {
  try {
    decorationService.requireAuth(getSessionId(req));
    const { id } = req.body || {};
    if (!id) return sendError(res, 'MISSING_ID', '缺少 id', 400);
    const result = decorationService.applyFavorite(id);
    sendSuccess(res, { ...result, msg: '已应用收藏地图' });
  } catch (err) { next(err); }
});

export const officeController = router;
