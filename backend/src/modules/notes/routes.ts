import { Hono } from 'hono';
import { z } from 'zod';
import { noteRepo } from '../../repositories/noteRepo.js';
import { ok, httpError } from '../../utils/response.js';
import { AppError } from '../../utils/errors.js';
import { requireAuth, type AuthState } from '../../middleware/auth.js';

const createSchema = z.object({
  bookId: z.string().min(1).max(64),
  chapter: z.number().int().optional(),
  page: z.number().int().optional(),
  type: z.enum(['note', 'bookmark']).optional(),
  content: z.string().optional(),
});

const listQuerySchema = z.object({
  bookId: z.string().min(1).max(64).optional(),
  type: z.enum(['note', 'bookmark']).optional(),
});

export const noteRoutes = new Hono<AuthState>();

noteRoutes.get('/', requireAuth, async c => {
  const userId = c.get('user').sub;
  const q = listQuerySchema.safeParse(c.req.query());
  if (!q.success) throw new AppError(400, q.error.issues.map(i => i.message).join('; '));
  const list = await noteRepo.listByUser(userId, q.data.bookId, q.data.type);
  return ok(c, list);
});

noteRoutes.post('/', requireAuth, async c => {
  const userId = c.get('user').sub;
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw new AppError(400, parsed.error.issues.map(i => i.message).join('; '));
  const note = await noteRepo.create(userId, parsed.data);
  return ok(c, note);
});

noteRoutes.put('/:id', requireAuth, async c => {
  const body = await c.req.json();
  const parsed = createSchema.partial().safeParse(body);
  if (!parsed.success) throw new AppError(400, parsed.error.issues.map(i => i.message).join('; '));
  const note = await noteRepo.update(c.req.param('id'), parsed.data);
  if (!note) return httpError(c, 404, '笔记不存在');
  return ok(c, note);
});

noteRoutes.delete('/:id', requireAuth, async c => {
  await noteRepo.remove(c.req.param('id'));
  return ok(c, null, '删除成功');
});
