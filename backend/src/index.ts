import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

serve({ fetch: app.fetch, port: config.port }, () => {
  console.log(`[backend] 服务已启动: http://localhost:${config.port}`);
  console.log(`[backend] 环境: ${config.nodeEnv} | 数据库: ${config.db.driver}`);
});
