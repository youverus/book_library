import { Hono } from 'hono';
import { userRepo } from '../../repositories/userRepo.js';
import { ok } from '../../utils/response.js';
import { requireAuth, requireAdmin, type AuthState } from '../../middleware/auth.js';

export const userRoutes = new Hono<AuthState>();

// 管理员：列出所有非管理员用户（仅返回 id, username, email, role, createdAt）
userRoutes.get('/', requireAuth, requireAdmin, async c => {
  const users = await userRepo.listExcludeAdmin();
  return ok(c, users);
});
