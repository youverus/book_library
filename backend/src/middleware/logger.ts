import type { Context, Next } from 'hono';

export function requestLogger() {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`${c.req.method} ${c.req.url} -> ${c.res.status} ${ms}ms`);
  };
}
