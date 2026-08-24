import { eq, and, desc } from 'drizzle-orm';
import { getDB, schema } from '../db/index.js';
import { newId } from '../utils/uuid.js';
import { sql } from 'drizzle-orm';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const inviteCodeRepo = {
  db: getDB(),

  async create(createdBy: string, code?: string) {
    const id = newId();
    const finalCode = code || generateCode();
    await this.db.insert(schema.inviteCodes).values({
      id,
      code: finalCode,
      createdBy,
      status: 'unused',
    });
    return this.findByCode(finalCode);
  },

  async findByCode(code: string) {
    const rows = await this.db.select().from(schema.inviteCodes).where(eq(schema.inviteCodes.code, code)).limit(1);
    return rows[0] || null;
  },

  async findById(id: string) {
    const rows = await this.db.select().from(schema.inviteCodes).where(eq(schema.inviteCodes.id, id)).limit(1);
    return rows[0] || null;
  },

  async listAll() {
    return this.db.select().from(schema.inviteCodes).orderBy(desc(schema.inviteCodes.createdAt));
  },

  async listByCreator(createdBy: string) {
    return this.db.select().from(schema.inviteCodes).where(eq(schema.inviteCodes.createdBy, createdBy)).orderBy(desc(schema.inviteCodes.createdAt));
  },

  async markAsUsed(code: string, userId: string) {
    await this.db.update(schema.inviteCodes)
      .set({ status: 'used', usedBy: userId, usedAt: sql`(datetime('now'))` })
      .where(and(eq(schema.inviteCodes.code, code), eq(schema.inviteCodes.status, 'unused')));
  },

  async revoke(id: string) {
    await this.db.update(schema.inviteCodes)
      .set({ status: 'revoked' })
      .where(and(eq(schema.inviteCodes.id, id), eq(schema.inviteCodes.status, 'unused')));
  },

  async countUnused() {
    const rows = await this.db.select({ count: sql<number>`count(*)` }).from(schema.inviteCodes).where(eq(schema.inviteCodes.status, 'unused'));
    return Number(rows[0]?.count || 0);
  },

  async isValid(code: string): Promise<boolean> {
    const record = await this.findByCode(code);
    return record !== null && record.status === 'unused';
  },

  async consume(code: string, userId: string): Promise<boolean> {
    const record = await this.findByCode(code);
    if (!record || record.status !== 'unused') {
      return false;
    }
    await this.markAsUsed(code, userId);
    return true;
  },
};
