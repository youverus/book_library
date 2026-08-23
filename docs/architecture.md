# Book Library — 架构与技术方案

> 本文档详细说明 Book Library 书城项目的整体架构、技术选型理由、数据模型、同步机制、扩展性设计，以及针对 2G 内存云服务器的优化策略。

---

## 1. 设计目标与约束

| 目标 | 说明 |
|---|---|
| 多端同步 | 手机 / 平板 / 桌面的阅读进度、书架、笔记实时一致 |
| 轻量部署 | 2G 内存阿里云服务器流畅运行 |
| 跨平台 | 一套前端覆盖所有设备 |
| 可扩展 | 新功能（评论、上传、推荐）可模块化接入 |
| 可演进 | 数据库从 SQLite 平滑迁移到 PostgreSQL |

---

## 2. 总体架构

```
┌──────────────────────────────────────────────────────────┐
│                    用户设备（多端）                         │
│    📱 手机端     🖥️ 桌面端     📟 平板端                    │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTPS
                         ▼
               ┌──────────────────┐
               │   Nginx (443/80) │  ← SSL 终止、静态缓存、Gzip
               └───────┬──────────┘
                       │
          ┌────────────┼────────────┐
          ▼                         ▼
   ┌──────────────┐        ┌──────────────┐
   │  Next.js     │        │  Hono API    │
   │  前端 (3000) │        │  后端 (8000) │
   └──────────────┘        └──────┬───────┘
                                  │
                                  ▼
                          ┌──────────────┐
                          │  SQLite /    │
                          │  PostgreSQL  │
                          └──────────────┘
```

**数据流**：浏览器 → Nginx（反代）→ `/` 走前端、`/api` 走后端 → 数据库。

---

## 3. 技术栈选型理由

### 3.1 前端：Next.js 15 + Tailwind CSS

- **Next.js App Router**：服务端组件 + 客户端组件混合，首屏快、SEO 友好。
- **Tailwind CSS**：原子化 CSS，响应式断点（sm/md/lg/xl）一行搞定多端适配。
- **静态资源走 Nginx**：生产环境前端产物由 Nginx 直接托管，Node 进程只做 SSR/ISR，降低内存。
- 选 Next.js 而非 Vue/Nuxt：生态更成熟、App Router 对 SEO/SSR 支持更完善。

### 3.2 后端：Hono + Drizzle ORM

- **Hono**：极轻量（依赖少、启动快、内存占用低），比 Express/Koa 省资源，2G 服务器友好。
- **Drizzle ORM**：TypeScript-first，类型推导到数据库层，SQL-like 查询性能好，支持 sqlite/postgres 双驱动。
- 选 Hono 而非 NestJS：NestJS 依赖多、启动慢、内存高，2G 服务器吃力；Hono 更符合「轻量」目标。

### 3.3 数据库：SQLite（默认）/ PostgreSQL（可选）

- **SQLite 起步**：零运维、无单独进程、内存占用 < 100MB，完美适配 2G 服务器。
- **Repository 模式**：业务代码只通过 Repository 接口访问数据，底层驱动可换。
- **预留 PostgreSQL**：当数据量/并发增长，换一个 `db/index.ts` 驱动即可，业务代码不动。

### 3.4 部署：Docker Compose + Nginx

- **Docker Compose**：一键编排所有服务，本地和生产一致。
- **Nginx**：反向代理、SSL 终止、静态资源托管、Gzip 压缩、请求限流。
- **Certbot**：Let's Encrypt 自动签发 + 12h 续期，免手动维护证书。

---

## 4. 目录结构与职责

```
book_library/
├── backend/
│   ├── src/
│   │   ├── index.ts               # 入口：启动 HTTP 服务
│   │   ├── app.ts                 # Hono 实例装配（中间件 + 路由）
│   │   ├── config.ts              # 配置（env 读取、默认值）
│   │   ├── db/
│   │   │   ├── index.ts           # 数据库连接（sqlite/postgres 切换点）
│   │   │   ├── schema.ts          # Drizzle schema 定义
│   │   │   ├── migrate.ts         # 迁移执行
│   │   │   └── seed.ts            # 初始数据（管理员账号、示例书籍）
│   │   ├── modules/               # 业务模块（每个模块自洽：路由 + service + repo）
│   │   │   ├── auth/               # 注册 / 登录 / JWT
│   │   │   ├── books/              # 书籍 CRUD、详情、分类
│   │   │   ├── bookshelf/          # 用户书架
│   │   │   ├── progress/           # 阅读进度
│   │   │   ├── notes/              # 书签 / 笔记
│   │   │   └── search/             # 全文搜索
│   │   ├── repositories/          # 数据访问抽象（切库不改业务代码）
│   │   ├── middleware/            # 鉴权、错误处理、请求日志、限流
│   │   └── utils/                 # JWT、密码哈希、响应封装
│   ├── data/                      # sqlite 文件目录（gitignore）
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── app/                   # App Router 页面
│   │   │   ├── layout.tsx         # 根布局
│   │   │   ├── page.tsx           # 首页
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── books/[id]/page.tsx
│   │   │   ├── bookshelf/page.tsx
│   │   │   ├── search/page.tsx
│   │   │   └── me/page.tsx
│   │   ├── components/            # UI 组件
│   │   ├── hooks/                 # 数据获取 hooks
│   │   ├── lib/                   # API 客户端、工具函数
│   │   └── stores/                # 状态管理（auth、书架缓存）
│   ├── public/                    # 静态资源
│   ├── Dockerfile
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   └── tsconfig.json
│
├── nginx/
│   ├── nginx.dev.conf             # 开发环境（HTTP）
│   └── nginx.prod.conf            # 生产环境（HTTPS + 静态缓存）
│
├── docs/
│   ├── architecture.md            # 本文档
│   ├── deploy.md                  # 云上部署指南
│   ├── api.md                     # API 文档
│   └── git-workflow.md            # Git 版本管理规范
│
├── scripts/
│   ├── backup.sh                  # 数据库备份
│   └── migrate.sh                 # 数据库迁移
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 5. 数据模型

### 5.1 核心实体

- **users**：用户（id, username, email, password_hash, created_at, updated_at）
- **books**：书籍（id, title, author, cover_url, description, category, total_chapters, total_pages, created_at）
- **bookshelves**：书架（id, user_id, name, created_at）
- **bookshelf_items**：书架条目（id, bookshelf_id, book_id, created_at）
- **reading_progress**：阅读进度（id, user_id, book_id, chapter, page, percentage, last_position, updated_at）
- **notes**：笔记/书签（id, user_id, book_id, chapter, page, content, type, created_at, updated_at）

### 5.2 关键设计

- **reading_progress 用 `(user_id, book_id)` 唯一约束**：一个用户对一本书只有一条进度，更新即覆盖。
- **notes 用 `updated_at` 做增量同步**：客户端只拉取 `since` 时间之后的变更。
- **bookshelves + bookshelf_items 多对多**：一本书可入多个书架，一个书架多本书。

---

## 6. 多端同步机制

### 6.1 同步策略：服务端权威 + 增量拉取

- **服务端是唯一真相源**：所有阅读进度、笔记、书架变更都先写后端。
- **增量拉取**：客户端本地存 `last_synced_at`，每次同步请求 `GET /api/sync?since=<timestamp>`，只返回变更。
- **冲突处理**：进度取 `updated_at` 最新的；笔记按最后写入胜出（LWW, Last-Write-Wins），满足「足够好」的一致性。

### 6.2 同步流程

```
客户端 A (手机)          服务端              客户端 B (桌面)
    │                      │                      │
    │  POST /progress      │                      │
    │─────────────────────▶│                      │
    │                      │  写 DB, updated_at   │
    │  200 OK              │                      │
    │◀─────────────────────│                      │
    │                      │                      │
    │                      │  GET /sync?since=..  │
    │                      │◀─────────────────────│
    │                      │  返回 progress 变更   │
    │                      │─────────────────────▶│
    │                      │  客户端 B 更新本地     │
```

### 6.3 为什么不用 WebSocket

- 书城同步频率低（阅读时才触发），轮询/按需拉取足够。
- WebSocket 需要长连接，2G 服务器内存吃紧，增加复杂度无收益。
- 后续如需推送（如新书通知），可单独加 SSE 模块，不破坏现有架构。

---

## 7. API 设计概览

- **RESTful 风格**：`/api/<resource>`，标准 HTTP 方法。
- **统一响应格式**：`{ code: 0, data: ..., message: "ok" }`。
- **鉴权**：JWT（Bearer Token），存 httpOnly cookie + Authorization header 双支持。
- **限流**：Nginx 层 `limit_req` + 后端令牌桶双层限流。
- 完整 API 详见 [api.md](api.md)。

---

## 8. 安全性

- **密码**：bcrypt 哈希（cost=10），永不存明文。
- **JWT**：RS256/HS256，exp 7d，refresh token 机制。
- **HTTPS**：Let's Encrypt 自动续期，HSTS 强制。
- **CORS**：白名单限制，不允许 `*`。
- **SQL 注入**：Drizzle 参数化查询，无拼接。
- **XSS**：Next.js 默认转义 + CSP header。
- **限流**：Nginx + 后端双层。

---

## 9. 性能与 2G 内存优化

### 9.1 内存预算（2G 服务器）

| 组件 | 内存占用 |
|---|---|
| OS + 基础服务 | ~300MB |
| Nginx | ~20MB |
| 后端 Hono | ~80-150MB |
| 前端 Next.js | ~150-300MB |
| SQLite | ~50MB（缓存） |
| **剩余** | **~1.2GB+（峰值缓冲）** |

### 9.2 优化策略

- **Nginx 托管静态资源**：前端 `.next/static`、图片直接走 Nginx，不进 Node。
- **Gzip/Brotli 压缩**：文本资源体积减 60-80%。
- **HTTP 缓存头**：静态资源 `Cache-Control: max-age=31536000, immutable`。
- **数据库连接池**：SQLite 单连接即可；Postgres 用 `pg` 小连接池（max=5）。
- **Next.js 生产构建**：`output: 'standalone'` 减小镜像体积。
- **Hono 单进程**：SQLite 场景无需 cluster，省内存；Postgres 场景再启用 PM2 cluster。

---

## 10. 可扩展性设计

### 10.1 Repository 模式

```
Service 层 ──▶ Repository 接口 ──▶ SqliteRepository / PostgresRepository
```

- 业务代码只依赖 Repository 接口。
- 切库只需新增一个实现 + 改 `db/index.ts` 驱动，业务代码 0 改动。

### 10.2 功能模块化

每个业务模块自包含（路由 + service + repo），新增功能（评论、上传、推荐）只需：

1. 在 `modules/` 下新建目录。
2. 在 `app.ts` 注册路由。
3. 在 `db/schema.ts` 加表 + 迁移。

### 10.3 未来扩展方向

- **EPUB/PDF 解析**：独立微服务，解析后存章节表。
- **推荐系统**：离线批处理，结果写缓存表。
- **评论系统**：独立模块，树形结构存储。
- **搜索升级**：SQLite FTS5 → Meilisearch/Elasticsearch。

---

## 11. 监控与运维

- **健康检查**：`/health` 端点返回 DB 连通性。
- **日志**：JSON 格式 stdout，Docker 收集。
- **备份**：每日 SQLite 文件快照（`scripts/backup.sh`），可配 OSS 上传。
- **告警**：后续可接 Uptime Kuma。

---

## 12. 为什么这样设计（总结）

- **全 TypeScript**：前后端类型共享、减少上下文切换、IDE 智能提示。
- **Hono + Drizzle + SQLite**：在 2G 服务器上跑得动、跑得快、够用。
- **Repository + 模块化**：为未来演进留足空间，但不提前过度设计。
- **Nginx + Docker Compose**：部署简单、可重现、易维护。
- **服务端权威 + 增量同步**：多端一致性的最小可行方案。
