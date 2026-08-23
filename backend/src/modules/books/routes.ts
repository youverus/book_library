import { Hono } from 'hono';
import { z } from 'zod';
import { bookRepo } from '../../repositories/bookRepo.js';
import { ok, httpError } from '../../utils/response.js';
import { AppError } from '../../utils/errors.js';
import { requireAuth, requireAdmin, optionalAuth, type AuthState } from '../../middleware/auth.js';

const createSchema = z.object({
  title: z.string().min(1),
  author: z.string().optional(),
  coverUrl: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  totalChapters: z.number().int().optional(),
  totalPages: z.number().int().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  category: z.string().optional(),
  keyword: z.string().optional(),
  sort: z.enum(['newest', 'popular', 'title']).optional(),
});

export const bookRoutes = new Hono<AuthState>();

// 公开：书籍列表
bookRoutes.get('/', async c => {
  const q = listQuerySchema.safeParse(c.req.query());
  if (!q.success) throw new AppError(400, q.error.issues.map(i => i.message).join('; '));
  const result = await bookRepo.list(q.data);
  return ok(c, result);
});

// 公开：分类列表
bookRoutes.get('/categories', async c => {
  const cats = await bookRepo.listCategories();
  return ok(c, cats);
});

// 公开：书籍详情
bookRoutes.get('/:id', async c => {
  const id = c.req.param('id');
  const book = await bookRepo.findById(id);
  if (!book) return httpError(c, 404, '书籍不存在');
  return ok(c, book);
});

// 管理员：新增
bookRoutes.post('/', requireAuth, requireAdmin, async c => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw new AppError(400, parsed.error.issues.map(i => i.message).join('; '));
  const book = await bookRepo.create(parsed.data);
  return ok(c, book);
});

// 管理员：更新
bookRoutes.put('/:id', requireAuth, requireAdmin, async c => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = createSchema.partial().safeParse(body);
  if (!parsed.success) throw new AppError(400, parsed.error.issues.map(i => i.message).join('; '));
  const book = await bookRepo.update(id, parsed.data);
  if (!book) return httpError(c, 404, '书籍不存在');
  return ok(c, book);
});

// 管理员：删除
bookRoutes.delete('/:id', requireAuth, requireAdmin, async c => {
  const id = c.req.param('id');
  const existing = await bookRepo.findById(id);
  if (!existing) return httpError(c, 404, '书籍不存在');
  await bookRepo.remove(id);
  return ok(c, null, '删除成功');
});
