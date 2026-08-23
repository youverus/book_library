import type { Context, Next } from 'hono';
import { httpError } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { ZodError } from 'zod';

export function errorHandler() {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (err) {
      if (err instanceof ZodError) {
        return httpError(c, 400, err.issues.map(i => i.message).join('; '));
      }
      if (err instanceof AppError) {
        return httpError(c, err.code, err.message, err.status);
      }
      console.error('[unhandled error]', err);
      return httpError(c, 500, '服务器内部错误');
    }
  };
}
