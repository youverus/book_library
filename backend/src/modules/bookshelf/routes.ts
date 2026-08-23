import { Hono } from 'hono';
import { z } from 'zod';
import { bookshelfRepo } from '../../repositories/bookshelfRepo.js';
import { ok, httpError } from '../../utils/response.js';
import { AppError } from '../../utils/errors.js';
import { requireAuth, type AuthState } from '../../middleware/auth.js';

const createSchema = z.object({ name: z.string().min(1).max(50) });
const addBookSchema = z.object({ bookId: z.string().min(1).max(64) });

export const bookshelfRoutes = new Hono<AuthState>();

// 列出当前用户所有书架
bookshelfRoutes.get('/', requireAuth, async c => {
  const userId = c.get('user').sub;
  const shelves = await bookshelfRepo.listByUser(userId);
  return ok(c, shelves);
});

// 创建书架
bookshelfRoutes.post('/', requireAuth, async c => {
  const userId = c.get('user').sub;
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw new AppError(400, parsed.error.issues.map(i => i.message).join('; '));
  const shelf = await bookshelfRepo.create(userId, parsed.data.name);
  return ok(c, shelf);
});

// 重命名
bookshelfRoutes.put('/:id', requireAuth, async c => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw new AppError(400, parsed.error.issues.map(i => i.message).join('; '));
  const shelf = await bookshelfRepo.rename(c.req.param('id'), parsed.data.name);
  return ok(c, shelf);
});

// 删除
bookshelfRoutes.delete('/:id', requireAuth, async c => {
  await bookshelfRepo.remove(c.req.param('id'));
  return ok(c, null, '删除成功');
});

// 列出书架中的书
bookshelfRoutes.get('/:id/books', requireAuth, async c => {
  const books = await bookshelfRepo.listBooks(c.req.param('id'));
  return ok(c, books);
});

// 添加书到书架
bookshelfRoutes.post('/:id/books', requireAuth, async c => {
  const body = await c.req.json();
  const parsed = addBookSchema.safeParse(body);
  if (!parsed.success) throw new AppError(400, parsed.error.issues.map(i => i.message).join('; '));
  const item = await bookshelfRepo.addBook(c.req.param('id'), parsed.data.bookId);
  return ok(c, item);
});

// 从书架移除书
bookshelfRoutes.delete('/:id/books/:bookId', requireAuth, async c => {
  await bookshelfRepo.removeBook(c.req.param('id'), c.req.param('bookId'));
  return ok(c, null, '移除成功');
});
