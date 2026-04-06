import { Router, type Request, type Response, type NextFunction } from 'express';
import { authService } from './auth.service.js';
import { requireAuth } from './auth.middleware.js';
import { validate } from '../../shared/validator.js';
import { sendSuccess } from '../../shared/response.js';
import { loginSchema } from './auth.types.js';
import { UnauthorizedError } from '../../shared/errors.js';

const router = Router();

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (_req: Request, res: Response) => {
  // For JWT-based auth, logout is client-side (discard token).
  // Could add token blacklist here if needed.
  sendSuccess(res, { message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = authService.getMe(req.user!.sub);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new UnauthorizedError('Missing refresh token');
    }
    const tokens = authService.refreshToken(refreshToken);
    sendSuccess(res, tokens);
  } catch (err) {
    next(err);
  }
});

export const authController = router;
