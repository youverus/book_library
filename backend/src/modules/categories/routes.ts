import { Hono } from 'hono';
import { z } from 'zod';
import { categoryRepo } from '../../repositories/categoryRepo.js';
import { ok, httpError } from '../../utils/response.js';
import { AppError } from '../../utils/errors.js';
import { requireAuth, requireAdmin, type AuthState } from '../../middleware/auth.js';

const createSchema = z.object({
  name: z.string().min(1).max(20),
});

export const categoryRoutes = new Hono<AuthState>();

// 公开：分类列表
categoryRoutes.get('/', async c => {
  const cats = await categoryRepo.listAll();
  return ok(c, cats.map(c => ({ category: c.name, id: c.id, sortOrder: c.sortOrder })));
});

// 管理员：新增分类
categoryRoutes.post('/', requireAuth, requireAdmin, async c => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw new AppError(400, parsed.error.issues.map(i => i.message).join('; '));
  const { name } = parsed.data;
  const existing = await categoryRepo.findByName(name);
  if (existing) {
    throw new AppError(409, '该分类已存在');
  }
  const cat = await categoryRepo.create(name);
  return ok(c, { id: cat!.id, name: cat!.name, sortOrder: cat!.sortOrder }, '分类创建成功');
});

// 管理员：删除分类（仅当该分类下无书籍时）
categoryRoutes.delete('/:name', requireAuth, requireAdmin, async c => {
  const { name } = c.req.param();
  const cat = await categoryRepo.findByName(name);
  if (!cat) return httpError(c, 404, '分类不存在');
  const bookCount = await categoryRepo.countBooks(name);
  if (bookCount > 0) {
    throw new AppError(400, `该分类下还有 ${bookCount} 本书，无法删除`);
  }
  await categoryRepo.remove(cat.id);
  return ok(c, null, '分类已删除');
});
