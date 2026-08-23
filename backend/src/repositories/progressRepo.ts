import { eq, and, sql } from 'drizzle-orm';
import { getDB, schema } from '../db/index.js';
import { newId } from '../utils/uuid.js';

export interface UpsertProgressInput {
  chapter?: number;
  page?: number;
  percentage?: string;
  lastPosition?: string;
}

export const progressRepo = {
  db: getDB(),

  async upsert(userId: string, bookId: string, input: UpsertProgressInput) {
    const existing = await this.db.select().from(schema.readingProgress).where(and(eq(schema.readingProgress.userId, userId), eq(schema.readingProgress.bookId, bookId))).limit(1);
    const patch: Record<string, unknown> = { updatedAt: sql`(datetime('now'))` };
    if (input.chapter !== undefined) patch.chapter = input.chapter;
    if (input.page !== undefined) patch.page = input.page;
    if (input.percentage !== undefined) patch.percentage = input.percentage;
    if (input.lastPosition !== undefined) patch.lastPosition = input.lastPosition;

    if (existing[0]) {
      await this.db.update(schema.readingProgress).set(patch).where(eq(schema.readingProgress.id, existing[0].id));
    } else {
      const id = newId();
      await this.db.insert(schema.readingProgress).values({ id, userId, bookId, chapter: input.chapter || 0, page: input.page || 0, percentage: input.percentage || '0', lastPosition: input.lastPosition || '' });
    }
    return this.findByUserAndBook(userId, bookId);
  },

  async findByUserAndBook(userId: string, bookId: string) {
    const rows = await this.db.select().from(schema.readingProgress).where(and(eq(schema.readingProgress.userId, userId), eq(schema.readingProgress.bookId, bookId))).limit(1);
    return rows[0] || null;
  },

  async listByUser(userId: string) {
    return this.db.select().from(schema.readingProgress).where(eq(schema.readingProgress.userId, userId));
  },

  async updatedSince(userId: string, since: string) {
    return this.db.select().from(schema.readingProgress).where(and(eq(schema.readingProgress.userId, userId), sql`${schema.readingProgress.updatedAt} > ${since}`));
  },
};
