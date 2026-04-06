import { v4 as uuidv4 } from 'uuid';
import type { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
  traceId: string;
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const traceId = (res.locals.traceId as string) || uuidv4();
  res.status(statusCode).json({
    success: true,
    data,
    traceId,
  } satisfies ApiResponse<T>);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; pageSize: number; total: number },
): void {
  const traceId = (res.locals.traceId as string) || uuidv4();
  res.status(200).json({
    success: true,
    data,
    pagination,
    traceId,
  } satisfies ApiResponse<T[]>);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 500,
  details?: unknown,
): void {
  const traceId = (res.locals.traceId as string) || uuidv4();
  res.status(statusCode).json({
    success: false,
    error: { code, message, details },
    traceId,
  } satisfies ApiResponse);
}
