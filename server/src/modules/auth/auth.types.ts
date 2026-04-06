import { z } from 'zod';

export type Role = 'admin' | 'viewer';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface UserResponse {
  id: string;
  username: string;
  role: Role;
  createdAt: string;
}

export interface TokenPayload {
  sub: string;
  username: string;
  role: Role;
  type: 'access' | 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(128),
});

export type LoginDTO = z.infer<typeof loginSchema>;
