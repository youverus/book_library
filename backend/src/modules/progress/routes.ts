import { Hono } from 'hono';
import { z } from 'zod';
import { progressRepo } from '../../repositories/progressRepo.js';
import { ok } from '../../utils/response.js';
import { AppError } from '../../utils/errors.js';
import { requireAuth, type AuthState } from '../../middleware/auth.js';

const upsertSchema = z.object({
  chapter: z.number().int().optional(),
  page: z.number().int().optional(),
  percentage: z.string().optional(),
  lastPosition: z.string().optional(),
});

export const progressRoutes = new Hono<AuthState>();

// 获取某本书进度
progressRoutes.get('/:bookId', requireAuth, async c => {
  const userId = c.get('user')?.sub ?? '';
  if (!userId) throw new AppError(401, '未登录');
  const bookId = c.req.param('bookId') ?? '';
  const progress = await progressRepo.findByUserAndBook(userId, bookId);
  return ok(c, progress);
});

// 获取当前用户全部进度
progressRoutes.get('/', requireAuth, async c => {
  const userId = c.get('user')?.sub ?? '';
  if (!userId) throw new AppError(401, '未登录');
  const list = await progressRepo.listByUser(userId);
  return ok(c, list);
});

// 更新进度（upsert）
progressRoutes.put('/:bookId', requireAuth, async c => {
  const userId = c.get('user')?.sub ?? '';
  if (!userId) throw new AppError(401, '未登录');
  const bookId = c.req.param('bookId') ?? '';
  const body = await c.req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) throw new AppError(400, parsed.error.issues.map(i => i.message).join('; '));
  const progress = await progressRepo.upsert(userId, bookId, parsed.data);
  return ok(c, progress);
});

// 删除进度（重新开始阅读）
progressRoutes.delete('/:bookId', requireAuth, async c => {
  const userId = c.get('user')?.sub ?? '';
  if (!userId) throw new AppError(401, '未登录');
  const bookId = c.req.param('bookId') ?? '';
  await progressRepo.delete(userId, bookId);
  return ok(c, { success: true });
});
