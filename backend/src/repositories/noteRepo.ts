import { eq, and, desc, sql } from 'drizzle-orm';
import { getDB, schema } from '../db/index.js';
import { newId } from '../utils/uuid.js';

export interface CreateNoteInput {
  bookId: string;
  chapter?: number;
  page?: number;
  type?: 'note' | 'bookmark';
  content?: string;
}

export const noteRepo = {
  db: getDB(),

  async create(userId: string, input: CreateNoteInput) {
    const id = newId();
    await this.db.insert(schema.notes).values({
      id,
      userId,
      bookId: input.bookId,
      chapter: input.chapter || 0,
      page: input.page || 0,
      type: input.type || 'note',
      content: input.content || '',
    });
    return this.findById(id);
  },

  async findById(id: string) {
    const rows = await this.db.select().from(schema.notes).where(eq(schema.notes.id, id)).limit(1);
    return rows[0] || null;
  },

  async listByUser(userId: string, bookId?: string, type?: string) {
    const conds: any[] = [eq(schema.notes.userId, userId)];
    if (bookId) conds.push(eq(schema.notes.bookId, bookId));
    if (type) conds.push(eq(schema.notes.type, type as 'note' | 'bookmark'));
    return this.db.select().from(schema.notes).where(and(...conds)).orderBy(desc(schema.notes.updatedAt));
  },

  async update(id: string, patch: Partial<CreateNoteInput>) {
    const set: Record<string, unknown> = { updatedAt: sql`(datetime('now'))` };
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) set[k] = v;
    await this.db.update(schema.notes).set(set).where(eq(schema.notes.id, id));
    return this.findById(id);
  },

  async remove(id: string) {
    await this.db.delete(schema.notes).where(eq(schema.notes.id, id));
  },

  async updatedSince(userId: string, since: string) {
    return this.db.select().from(schema.notes).where(and(eq(schema.notes.userId, userId), sql`${schema.notes.updatedAt} > ${since}`));
  },
};
