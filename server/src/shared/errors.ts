export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      `${resource.toUpperCase()}_NOT_FOUND`,
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      404,
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super('FORBIDDEN', message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super('VALIDATION_ERROR', 'Request validation failed', 400, details);
  }
}

export class GatewayError extends AppError {
  constructor(message: string, details?: unknown) {
    super('GATEWAY_ERROR', message, 502, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}
