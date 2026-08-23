import { Hono } from 'hono';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { getDB, schema } from '../../db/index.js';
import { ok } from '../../utils/response.js';
import { AppError } from '../../utils/errors.js';

const searchSchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});

export const searchRoutes = new Hono();

searchRoutes.get('/', async c => {
  const parsed = searchSchema.safeParse(c.req.query());
  if (!parsed.success) throw new AppError(400, parsed.error.issues.map(i => i.message).join('; '));
  const { q, page = 1, pageSize = 20 } = parsed.data;
  const db = getDB();
  const kw = `%${q}%`;
  const offset = (page - 1) * pageSize;

  const conds = sql`(${schema.books.title} LIKE ${kw} OR ${schema.books.author} LIKE ${kw} OR ${schema.books.description} LIKE ${kw})`;
  const [items, countRows] = await Promise.all([
    db.select().from(schema.books).where(conds).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(schema.books).where(conds),
  ]);

  return ok(c, { items, total: Number(countRows[0]?.count || 0), page, pageSize });
});
