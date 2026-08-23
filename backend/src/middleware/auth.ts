import type { Context, Next } from 'hono';
import { verifyToken, type JwtPayload } from '../utils/jwt.js';
import { httpError } from '../utils/response.js';

export interface AuthState {
  Variables: { user: JwtPayload };
}

export async function requireAuth(c: Context<AuthState>, next: Next) {
  const header = c.req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return httpError(c, 401, '未登录');
  const payload = await verifyToken(token);
  if (!payload) return httpError(c, 401, 'token 失效或已过期');
  c.set('user', payload);
  await next();
}

export async function optionalAuth(c: Context<AuthState>, next: Next) {
  const header = c.req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token) {
    const payload = await verifyToken(token);
    if (payload) c.set('user', payload);
  }
  await next();
}

export function requireAdmin(c: Context<AuthState>, next: Next) {
  const user = c.get('user');
  if (!user || user.role !== 'admin') return httpError(c, 403, '需要管理员权限');
  return next();
}
