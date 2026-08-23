import { eq, and, like, desc, sql, type SQL } from 'drizzle-orm';
import { getDB, schema } from '../db/index.js';
import { newId } from '../utils/uuid.js';

export interface CreateBookInput {
  title: string;
  author?: string;
  coverUrl?: string;
  description?: string;
  category?: string;
  totalChapters?: number;
  totalPages?: number;
  filePath?: string;
  fileType?: 'txt' | 'epub' | 'pdf';
  fileSize?: number;
}

export interface UpdateBookInput extends Partial<CreateBookInput> {}

export interface ListBooksOptions {
  page?: number;
  pageSize?: number;
  category?: string;
  keyword?: string;
  sort?: 'newest' | 'popular' | 'title';
}

export const bookRepo = {
  db: getDB(),

  async create(input: CreateBookInput) {
    const id = newId();
    await this.db.insert(schema.books).values({
      id,
      title: input.title,
      author: input.author || '',
      coverUrl: input.coverUrl || '',
      description: input.description || '',
      category: input.category || '其他',
      totalChapters: input.totalChapters || 0,
      totalPages: input.totalPages || 0,
      filePath: input.filePath || '',
      fileType: input.fileType || 'txt',
      fileSize: input.fileSize || 0,
    });
    return this.findById(id);
  },

  async findById(id: string) {
    const rows = await this.db.select().from(schema.books).where(eq(schema.books.id, id)).limit(1);
    return rows[0] || null;
  },

  async update(id: string, input: UpdateBookInput) {
    const patch: Record<string, unknown> = { updatedAt: sql`(datetime('now'))` };
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined) patch[k] = v;
    }
    await this.db.update(schema.books).set(patch).where(eq(schema.books.id, id));
    return this.findById(id);
  },

  async remove(id: string) {
    await this.db.delete(schema.books).where(eq(schema.books.id, id));
  },

  async list(opts: ListBooksOptions) {
    const page = Math.max(1, opts.page || 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize || 20));
    const offset = (page - 1) * pageSize;

    const conds: SQL[] = [];
    if (opts.category) conds.push(eq(schema.books.category, opts.category));
    if (opts.keyword) conds.push(like(schema.books.title, `%${opts.keyword}%`));
    const where = conds.length ? and(...conds) : undefined;

    const orderBy = opts.sort === 'title' ? schema.books.title : desc(schema.books.createdAt);

    const [rows, countRows] = await Promise.all([
      this.db.select().from(schema.books).where(where).orderBy(orderBy).limit(pageSize).offset(offset),
      this.db.select({ count: sql<number>`count(*)` }).from(schema.books).where(where),
    ]);

    return { items: rows, total: Number(countRows[0]?.count || 0), page, pageSize };
  },

  async listCategories() {
    const rows = await this.db
      .select({ category: schema.books.category, count: sql<number>`count(*)` })
      .from(schema.books)
      .groupBy(schema.books.category);
    return rows.map(r => ({ category: r.category, count: Number(r.count) }));
  },
};
