import { eq, and, desc, sql } from 'drizzle-orm';
import { getDB, schema } from '../db/index.js';
import { newId } from '../utils/uuid.js';

export const bookshelfRepo = {
  db: getDB(),

  async create(userId: string, name: string) {
    const id = newId();
    await this.db.insert(schema.bookshelves).values({ id, userId, name });
    return this.findById(id);
  },

  async findById(id: string) {
    const rows = await this.db.select().from(schema.bookshelves).where(eq(schema.bookshelves.id, id)).limit(1);
    return rows[0] || null;
  },

  async listByUser(userId: string) {
    const shelves = await this.db.select().from(schema.bookshelves).where(eq(schema.bookshelves.userId, userId)).orderBy(desc(schema.bookshelves.createdAt));
    const withCount = await Promise.all(shelves.map(async s => {
      const rows = await this.db.select({ c: sql<number>`count(*)` }).from(schema.bookshelfItems).where(eq(schema.bookshelfItems.bookshelfId, s.id));
      return { ...s, bookCount: Number(rows[0]?.c || 0) };
    }));
    return withCount;
  },

  async rename(id: string, name: string) {
    await this.db.update(schema.bookshelves).set({ name, updatedAt: sql`(datetime('now'))` }).where(eq(schema.bookshelves.id, id));
    return this.findById(id);
  },

  async remove(id: string) {
    await this.db.delete(schema.bookshelves).where(eq(schema.bookshelves.id, id));
  },

  async addBook(bookshelfId: string, bookId: string) {
    const existing = await this.db.select().from(schema.bookshelfItems).where(and(eq(schema.bookshelfItems.bookshelfId, bookshelfId), eq(schema.bookshelfItems.bookId, bookId))).limit(1);
    if (existing[0]) return existing[0];
    const id = newId();
    await this.db.insert(schema.bookshelfItems).values({ id, bookshelfId, bookId });
    return this.db.select().from(schema.bookshelfItems).where(eq(schema.bookshelfItems.id, id)).limit(1).then(r => r[0]);
  },

  async removeBook(bookshelfId: string, bookId: string) {
    await this.db.delete(schema.bookshelfItems).where(and(eq(schema.bookshelfItems.bookshelfId, bookshelfId), eq(schema.bookshelfItems.bookId, bookId)));
  },

  async listBooks(bookshelfId: string) {
    const rows = await this.db
      .select({ book: schema.books, addedAt: schema.bookshelfItems.createdAt })
      .from(schema.bookshelfItems)
      .innerJoin(schema.books, eq(schema.bookshelfItems.bookId, schema.books.id))
      .where(eq(schema.bookshelfItems.bookshelfId, bookshelfId))
      .orderBy(desc(schema.bookshelfItems.createdAt));
    return rows.map(r => ({ ...r.book, addedAt: r.addedAt }));
  },

  async booksUpdatedSince(userId: string, since: string) {
    // 书架及其条目在 since 之后的变更（用于增量同步）
    const shelves = await this.db.select().from(schema.bookshelves).where(and(eq(schema.bookshelves.userId, userId), sql`${schema.bookshelves.updatedAt} > ${since}`));
    const items = await this.db.select().from(schema.bookshelfItems).where(sql`${schema.bookshelfItems.createdAt} > ${since}`);
    return { shelves, items };
  },
};
