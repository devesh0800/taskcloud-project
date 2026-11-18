import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  details?: any;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Multer errors
  if (err.name === 'MulterError') {
    res.status(400).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Handle Prisma Known Request Errors
  const prismaError = err as any;
  if (prismaError.code === 'P2002') {
    const target = Array.isArray(prismaError.meta?.target)
      ? prismaError.meta.target.join(', ')
      : 'field';
    res.status(409).json({
      success: false,
      message: `A record with this ${target} already exists.`,
    });
    return;
  }

  if (prismaError.code === 'P2025') {
    res.status(404).json({
      success: false,
      message: 'The requested record was not found or has already been removed.',
    });
    return;
  }

  let statusCode = (err as any).status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Sanitize internal credential leakage
  if (message.includes('postgres://') || message.includes('postgresql://') || message.includes('neon.tech')) {
    message = 'A database operation error occurred. Please try again.';
  }

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    console.error('[Error Details]:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && statusCode === 500 && { stack: err.stack }),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
}
