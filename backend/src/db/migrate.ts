import { getDB } from './index.js';

// 简易迁移：建表（幂等，IF NOT EXISTS）
export async function migrate() {
  const db = getDB();
  // @ts-ignore — better-sqlite3 原生 exec
  db.run ?? (() => {})();
  const sqlite = (db as any).session?.client || (db as any);

  // 直接用 drizzle 的 better-sqlite3 session 执行原始 SQL
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  const Database = (await import('better-sqlite3')).default;
  const { config } = await import('../config.js');
  const { mkdirSync } = await import('node:fs');
  const { dirname } = await import('node:path');
  mkdirSync(dirname(config.db.sqlitePath), { recursive: true });
  const raw = new Database(config.db.sqlitePath);
  raw.pragma('journal_mode = WAL');
  raw.pragma('foreign_keys = ON');

  raw.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT '',
      cover_url TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '其他',
      total_chapters INTEGER NOT NULL DEFAULT 0,
      total_pages INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS books_category_idx ON books(category);
    CREATE INDEX IF NOT EXISTS books_title_idx ON books(title);

    CREATE TABLE IF NOT EXISTS bookshelves (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS bookshelves_user_idx ON bookshelves(user_id);

    CREATE TABLE IF NOT EXISTS bookshelf_items (
      id TEXT PRIMARY KEY,
      bookshelf_id TEXT NOT NULL REFERENCES bookshelves(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS bookshelf_items_unique ON bookshelf_items(bookshelf_id, book_id);
    CREATE INDEX IF NOT EXISTS bookshelf_items_book_idx ON bookshelf_items(book_id);

    CREATE TABLE IF NOT EXISTS reading_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      chapter INTEGER NOT NULL DEFAULT 0,
      page INTEGER NOT NULL DEFAULT 0,
      percentage TEXT NOT NULL DEFAULT '0',
      last_position TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS progress_user_book_unique ON reading_progress(user_id, book_id);
    CREATE INDEX IF NOT EXISTS progress_user_idx ON reading_progress(user_id);

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      chapter INTEGER NOT NULL DEFAULT 0,
      page INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'note',
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS notes_user_idx ON notes(user_id);
    CREATE INDEX IF NOT EXISTS notes_book_idx ON notes(book_id);
  `);

  raw.close();
  console.log('[migrate] 数据库迁移完成');
}

// 直接运行
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate().catch(err => {
    console.error('[migrate] 失败:', err);
    process.exit(1);
  });
}
