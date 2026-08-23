import { Hono } from 'hono';
import { z } from 'zod';
import { progressRepo } from '../../repositories/progressRepo.js';
import { noteRepo } from '../../repositories/noteRepo.js';
import { bookshelfRepo } from '../../repositories/bookshelfRepo.js';
import { ok } from '../../utils/response.js';
import { AppError } from '../../utils/errors.js';
import { requireAuth, type AuthState } from '../../middleware/auth.js';

const syncSchema = z.object({
  since: z.string().min(1),
});

export const syncRoutes = new Hono<AuthState>();

syncRoutes.get('/', requireAuth, async c => {
  const userId = c.get('user').sub;
  const parsed = syncSchema.safeParse(c.req.query());
  if (!parsed.success) throw new AppError(400, '需要 since 参数（ISO 8601 时间戳）');
  const since = parsed.data.since;

  const [progress, notes, bookshelves] = await Promise.all([
    progressRepo.updatedSince(userId, since),
    noteRepo.updatedSince(userId, since),
    bookshelfRepo.booksUpdatedSince(userId, since),
  ]);

  const syncTime = new Date().toISOString();
  return ok(c, {
    progress,
    notes,
    bookshelves,
    syncTime,
  });
});
