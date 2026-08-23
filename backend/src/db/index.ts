import { config } from '../config.js';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as schema from './schema.js';

export type DB = BetterSQLite3Database<typeof schema>;

let _db: DB | null = null;

export function getDB(): DB {
  if (_db) return _db;
  if (config.db.driver === 'sqlite') {
    mkdirSync(dirname(config.db.sqlitePath), { recursive: true });
    const sqlite = new Database(config.db.sqlitePath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    _db = drizzle(sqlite, { schema });
  } else {
    // Postgres 切换点：此处替换为 node-postgres 驱动即可
    throw new Error('Postgres driver not wired yet. Switch DB_DRIVER=sqlite or implement the pg path.');
  }
  return _db;
}

export { schema };
