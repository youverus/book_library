import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './config.js';
import { errorHandler } from './middleware/error.js';
import { requestLogger } from './middleware/logger.js';
import { authRoutes } from './modules/auth/routes.js';
import { bookRoutes } from './modules/books/routes.js';
import { bookshelfRoutes } from './modules/bookshelf/routes.js';
import { progressRoutes } from './modules/progress/routes.js';
import { noteRoutes } from './modules/notes/routes.js';
import { searchRoutes } from './modules/search/routes.js';
import { syncRoutes } from './modules/sync/routes.js';
import { fileRoutes } from './modules/files/routes.js';
import { userRoutes } from './modules/users/routes.js';
import { categoryRoutes } from './modules/categories/routes.js';
import { inviteCodeRoutes } from './modules/invite-codes/routes.js';
import { ok } from './utils/response.js';
import type { AuthState } from './middleware/auth.js';

export function createApp() {
  const app = new Hono<AuthState>();

  // 全局中间件
  app.use('*', errorHandler());
  app.use('*', requestLogger());
  app.use('*', cors({
    origin: config.isProd
      ? ['https://youhxian.cn', 'https://www.youhxian.cn']
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  }));

  // 健康检查
  app.get('/health', async c => {
    let dbStatus = 'connected';
    try {
      const { getDB } = await import('./db/index.js');
      const db = getDB();
      // 简单查询验证连通性
      await db.run?.('SELECT 1' as any);
    } catch {
      dbStatus = 'disconnected';
    }
    return ok(c, { status: 'ok', db: dbStatus, uptime: process.uptime() });
  });

  // API 路由
  app.route('/api/auth', authRoutes);
  app.route('/api/books', bookRoutes);
  app.route('/api/bookshelves', bookshelfRoutes);
  app.route('/api/progress', progressRoutes);
  app.route('/api/notes', noteRoutes);
  app.route('/api/search', searchRoutes);
  app.route('/api/sync', syncRoutes);
  app.route('/api/files', fileRoutes);
  app.route('/api/users', userRoutes);
  app.route('/api/categories', categoryRoutes);
  app.route('/api/invite-codes', inviteCodeRoutes);

  // 404
  app.notFound(c => c.json({ code: 404, data: null, message: '接口不存在' }, 404));

  return app;
}
