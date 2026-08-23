import type { Context } from 'hono';

export function ok(c: Context, data: unknown, message = 'ok') {
  return c.json({ code: 0, data, message });
}

export function fail(c: Context, code: number, message: string, httpStatus = 200) {
  return c.json({ code, data: null, message }, httpStatus);
}

export function httpError(c: Context, status: number, message: string) {
  return c.json({ code: status, data: null, message }, status);
}
