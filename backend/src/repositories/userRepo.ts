import { eq } from 'drizzle-orm';
import { eq, ne, desc } from 'drizzle-orm';
import { getDB, schema } from '../db/index.js';
import { newId } from '../utils/uuid.js';

export interface CreateUserInput {
  username: string;
  email: string;
  passwordHash: string;
}

export const userRepo = {
  db: getDB(),

  async create(input: CreateUserInput) {
    const id = newId();
    await this.db.insert(schema.users).values({ id, username: input.username, email: input.email, passwordHash: input.passwordHash });
    return this.findById(id);
  },

  async findById(id: string) {
    const rows = await this.db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return rows[0] || null;
  },

  async findByUsername(username: string) {
    const rows = await this.db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
    return rows[0] || null;
  },

  async findByEmail(email: string) {
    const rows = await this.db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    return rows[0] || null;
  },

  async findByAccount(account: string) {
    const byName = await this.findByUsername(account);
    if (byName) return byName;
    return this.findByEmail(account);
  },

  async exists(username: string, email: string) {
    const u = await this.findByUsername(username);
    if (u) return 'username';
    const e = await this.findByEmail(email);
    if (e) return 'email';
    return null;
  },

  async listExcludeAdmin() {
    return this.db.select({
      id: schema.users.id,
      username: schema.users.username,
      email: schema.users.email,
      role: schema.users.role,
      createdAt: schema.users.createdAt,
    }).from(schema.users).where(ne(schema.users.role, 'admin')).orderBy(desc(schema.users.createdAt));
  },
};
