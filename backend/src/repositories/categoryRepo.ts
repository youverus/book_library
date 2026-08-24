import { eq, sql } from 'drizzle-orm';
import { getDB, schema } from '../db/index.js';
import { newId } from '../utils/uuid.js';

export const categoryRepo = {
  db: getDB(),

  async create(name: string) {
    const id = newId();
    await this.db.insert(schema.categories).values({ id, name });
    return this.findById(id);
  },

  async findById(id: string) {
    const rows = await this.db.select().from(schema.categories).where(eq(schema.categories.id, id)).limit(1);
    return rows[0] || null;
  },

  async findByName(name: string) {
    const rows = await this.db.select().from(schema.categories).where(eq(schema.categories.name, name)).limit(1);
    return rows[0] || null;
  },

  async listAll() {
    return this.db.select().from(schema.categories).orderBy(schema.categories.sortOrder);
  },

  async remove(id: string) {
    await this.db.delete(schema.categories).where(eq(schema.categories.id, id));
  },

  async countBooks(categoryName: string) {
    const rows = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.books)
      .where(eq(schema.books.category, categoryName));
    return Number(rows[0]?.count || 0);
  },
};
