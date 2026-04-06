import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { UnauthorizedError } from '../../shared/errors.js';
import { authRepository } from './auth.repository.js';
import type { AuthTokens, TokenPayload, UserResponse } from './auth.types.js';

export class AuthService {
  async login(username: string, password: string): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    const user = authRepository.findByUsername(username);
    if (!user) throw new UnauthorizedError('Invalid credentials');

    const valid = bcrypt.compareSync(password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    const tokens = this.generateTokens(user.id, user.username, user.role);

    return {
      user: { id: user.id, username: user.username, role: user.role, createdAt: user.createdAt },
      tokens,
    };
  }

  getMe(userId: string): UserResponse {
    const user = authRepository.findById(userId);
    if (!user) throw new UnauthorizedError('User not found');
    return { id: user.id, username: user.username, role: user.role, createdAt: user.createdAt };
  }

  refreshToken(refreshTokenStr: string): AuthTokens {
    const payload = this.verifyToken(refreshTokenStr, 'refresh');
    return this.generateTokens(payload.sub, payload.username, payload.role);
  }

  verifyToken(token: string, expectedType: 'access' | 'refresh' = 'access'): TokenPayload {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as TokenPayload;
      if (payload.type !== expectedType) {
        throw new UnauthorizedError('Invalid token type');
      }
      return payload;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  private generateTokens(userId: string, username: string, role: string): AuthTokens {
    const accessPayload: TokenPayload = { sub: userId, username, role: role as TokenPayload['role'], type: 'access' };
    const refreshPayload: TokenPayload = { sub: userId, username, role: role as TokenPayload['role'], type: 'refresh' };

    const accessToken = jwt.sign(accessPayload, config.jwt.secret, {
      expiresIn: config.jwt.accessExpires as unknown as number,
    });
    const refreshToken = jwt.sign(refreshPayload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpires as unknown as number,
    });

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
