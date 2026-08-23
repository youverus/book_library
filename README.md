# 📚 Book Library — 在线书城

> 一个轻量、跨平台、可自部署的在线书城。支持多端同步阅读进度、书架、笔记与搜索。

## ✨ 特性

- **多端同步**：阅读进度、书架、书签、笔记通过 API + 增量时间戳在手机/平板/桌面实时同步
- **响应式设计**：一套前端适配移动端、平板、桌面
- **轻量部署**：默认 SQLite，2G 内存云服务器流畅运行
- **可扩展**：Repository 模式数据层，可无缝切换到 PostgreSQL；模块化功能便于扩展阅读器引擎、评论、上传等
- **Docker Compose 一键部署**：Nginx 反代 + HTTPS + 后端 + 数据库

## 🏗️ 技术栈

- **前端**：Next.js 15 + Tailwind CSS（响应式、SSR/静态导出、生态成熟）
- **后端**：Hono + Drizzle ORM（极轻量、TypeScript 原生、2G 内存友好）
- **数据库**：SQLite（默认）/ PostgreSQL（可选，零运维起步，保留扩展口）
- **部署**：Docker Compose + Nginx（反向代理、HTTPS、静态资源托管）
- **语言**：全 TypeScript（前后端类型共享、减少上下文切换）

## 📁 项目结构

```
book_library/
├── backend/        # Hono + Drizzle 后端 API
├── frontend/       # Next.js 响应式前端
├── nginx/          # Nginx 配置模板
├── docs/           # 文档
├── scripts/        # 脚本
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🚀 快速开始

```bash
# 克隆
git clone <repo-url> && cd book_library

# 启动（开发，全部用 Docker Compose）
docker compose up -d

# 或本地开发（无需 Docker）
cd backend && pnpm install && pnpm dev      # http://localhost:8000
cd frontend && pnpm install && pnpm dev     # http://localhost:3000
```

## 📚 文档

- [架构与技术方案](docs/architecture.md)
- [云上部署指南](docs/deploy.md)（youhxian.cn + HTTPS）
- [API 文档](docs/api.md)
- [Git 版本管理规范](docs/git-workflow.md)

## 🌐 部署域名

生产环境域名：**youhxian.cn**（阿里云 + Nginx + Let's Encrypt SSL）

## 📄 License

MIT
