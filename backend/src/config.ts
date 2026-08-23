import { config as loadEnv } from 'node:fs';

// 简易 env 读取（避免引入 dotenv 依赖）
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadDotEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env 不存在时使用系统环境变量
  }
}

loadDotEnv();

export const config = {
  port: Number(process.env.BACKEND_PORT || 8000),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me-please-use-a-long-random-string',
    expiresIn: process.env.TOKEN_EXPIRES_IN || '7d',
  },
  db: {
    driver: (process.env.DB_DRIVER || 'sqlite') as 'sqlite' | 'postgres',
    sqlitePath: process.env.SQLITE_PATH || resolve(process.cwd(), 'data', 'book_library.db'),
    url: process.env.DATABASE_URL || '',
  },
  isProd: process.env.NODE_ENV === 'production',
};
