import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─── 用户 ───
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// ─── 书籍 ───
export const books = sqliteTable('books', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  author: text('author').notNull().default(''),
  coverUrl: text('cover_url').notNull().default(''),
  description: text('description').notNull().default(''),
  category: text('category').notNull().default('其他'),
  totalChapters: integer('total_chapters').notNull().default(0),
  totalPages: integer('total_pages').notNull().default(0),
  filePath: text('file_path').notNull().default(''),
  fileType: text('file_type', { enum: ['txt', 'epub', 'pdf'] }).notNull().default('txt'),
  fileSize: integer('file_size').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  categoryIdx: index('books_category_idx').on(t.category),
  titleIdx: index('books_title_idx').on(t.title),
}));

// ─── 书架 ───
export const bookshelves = sqliteTable('bookshelves', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  userIdx: index('bookshelves_user_idx').on(t.userId),
}));

// ─── 书架条目（多对多） ───
export const bookshelfItems = sqliteTable('bookshelf_items', {
  id: text('id').primaryKey(),
  bookshelfId: text('bookshelf_id').notNull().references(() => bookshelves.id, { onDelete: 'cascade' }),
  bookId: text('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  uniquePair: uniqueIndex('bookshelf_items_unique').on(t.bookshelfId, t.bookId),
  bookIdx: index('bookshelf_items_book_idx').on(t.bookId),
}));

// ─── 阅读进度 ───
export const readingProgress = sqliteTable('reading_progress', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookId: text('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  chapter: integer('chapter').notNull().default(0),
  page: integer('page').notNull().default(0),
  percentage: text('percentage').notNull().default('0'),
  lastPosition: text('last_position').notNull().default(''),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  uniqueUserBook: uniqueIndex('progress_user_book_unique').on(t.userId, t.bookId),
  userIdx: index('progress_user_idx').on(t.userId),
}));

// ─── 笔记 / 书签 ───
export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookId: text('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  chapter: integer('chapter').notNull().default(0),
  page: integer('page').notNull().default(0),
  type: text('type', { enum: ['note', 'bookmark'] }).notNull().default('note'),
  content: text('content').notNull().default(''),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  userIdx: index('notes_user_idx').on(t.userId),
  bookIdx: index('notes_book_idx').on(t.bookId),
}));

export type User = typeof users.$inferSelect;
export type Book = typeof books.$inferSelect;
export type Bookshelf = typeof bookshelves.$inferSelect;
export type BookshelfItem = typeof bookshelfItems.$inferSelect;
export type ReadingProgress = typeof readingProgress.$inferSelect;
export type Note = typeof notes.$inferSelect;

// ─── 邀请码 ───
export const inviteCodes = sqliteTable('invite_codes', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  createdBy: text('created_by').notNull().references(() => users.id),
  usedBy: text('used_by').references(() => users.id),
  status: text('status', { enum: ['unused', 'used', 'revoked'] }).notNull().default('unused'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  usedAt: text('used_at'),
}, (t) => ({
  codeIdx: uniqueIndex('invite_codes_code_idx').on(t.code),
  statusIdx: index('invite_codes_status_idx').on(t.status),
}));

export type InviteCode = typeof inviteCodes.$inferSelect;
