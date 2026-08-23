# Book Library — 后端实现详解

> 本文档详细说明 Book Library 后端的实现方案，包括技术选型、项目结构、数据库设计、API 接口、中间件、Repository 模式、鉴权机制、错误处理、部署配置以及扩展性设计。

---

## 目录

1. [技术选型与理由](#1-技术选型与理由)
2. [项目结构](#2-项目结构)
3. [数据库设计](#3-数据库设计)
4. [数据库连接层](#4-数据库连接层)
5. [Repository 模式](#5-repository-模式)
6. [业务模块与 API 接口](#6-业务模块与-api-接口)
7. [中间件系统](#7-中间件系统)
8. [鉴权与权限控制](#8-鉴权与权限控制)
9. [错误处理](#9-错误处理)
10. [请求生命周期](#10-请求生命周期)
11. [部署配置](#11-部署配置)
12. [扩展性设计](#12-扩展性设计)
13. [已知 TODO](#13-已知-todo)

---

## 1. 技术选型与理由

### 1.1 技术栈总览

| 层 | 技术 | 版本 | 选型理由 |
|---|---|---|---|
| 运行时 | Node.js | 20 LTS | 生态成熟、异步 I/O 适合 Web 服务 |
| 语言 | TypeScript | 5.7 | 类型安全、前后端类型共享、IDE 智能提示 |
| Web 框架 | Hono | 4.6 | 极轻量（依赖少、启动快、内存低），2G 服务器友好 |
| ORM | Drizzle ORM | 0.38 | TypeScript-first、类型推导到 DB 层、支持 sqlite/postgres |
| 数据库驱动 | better-sqlite3 | ^11 | 同步 API（无需 async/await 嵌套）、性能高 |
| 数据库 | SQLite | 内置 | 零运维、无单独进程、内存 < 100MB |
| 密码哈希 | bcryptjs | 2.4 | 纯 JS 实现（无需 native 编译）、cost 可调 |
| JWT | jose | 5.9 | 轻量、支持 HS256/RS256、Edge Runtime 兼容 |
| 校验 | Zod | 3.24 | TypeScript-first schema 校验、错误信息友好 |
| 开发工具 | tsx | 4.19 | 直接跑 TypeScript、watch 模式热重载 |

### 1.2 为什么选 Hono 而非 Express/NestJS

| 对比项 | Hono | Express | NestJS |
|---|---|---|---|
| 依赖数量 | ~5 | ~30 | ~100+ |
| 启动时间 | ~50ms | ~200ms | ~1000ms |
| 内存占用 | ~30MB | ~60MB | ~150MB |
| TypeScript 支持 | 原生 | 需 @types | 原生 |
| 中间件模型 | 洋葱模型 | 洋葱模型 | 装饰器 + 洋葱模型 |
| 学习成本 | 低 | 低 | 高 |
| 适合 2G 服务器 | ✅ | ⚠️ | ❌ |

**结论**：Hono 在 2G 服务器上跑得动、跑得快、够用。NestJS 依赖多、启动慢、内存高，2G 服务器吃力。

### 1.3 为什么选 Drizzle 而非 Prisma/TypeORM

| 对比项 | Drizzle | Prisma | TypeORM |
|---|---|---|---|
| 类型推导 | ✅ 完整 | ✅ 完整 | ⚠️ 部分 |
| 查询性能 | 接近原生 SQL | 有抽象层 | 有抽象层 |
| 包体积 | ~500KB | ~50MB（含 query engine） | ~5MB |
| 迁移工具 | 手写/drizzle-kit | 内置 migrate | 内置 |
| SQL 可读性 | ✅ SQL-like | 自有查询 DSL | 装饰器/QueryBuilder |
| 双驱动支持 | ✅ sqlite + postgres | ✅ 多数据库 | ✅ 多数据库 |

**结论**：Drizzle 轻量、类型推导完整、SQL-like 查询直观，适合本项目。

---

## 2. 项目结构

```
backend/
├── src/
│   ├── index.ts               # 入口：启动 HTTP 服务
│   ├── app.ts                 # Hono 应用装配（中间件 + 路由）
│   ├── config.ts              # 配置（env 读取、默认值）
│   │
│   ├── db/
│   │   ├── index.ts           # 数据库连接（sqlite/postgres 切换点）
│   │   ├── schema.ts          # Drizzle schema 定义（6 张表）
│   │   ├── migrate.ts         # 迁移执行（幂等建表）
│   │   └── seed.ts            # 初始数据（管理员 + 示例书籍）
│   │
│   ├── modules/               # 业务模块（每个模块自洽）
│   │   ├── auth/               # 注册/登录/JWT
│   │   │   └── routes.ts
│   │   ├── books/              # 书籍 CRUD、详情、分类
│   │   │   └── routes.ts
│   │   ├── bookshelf/          # 用户书架
│   │   │   └── routes.ts
│   │   ├── progress/           # 阅读进度
│   │   │   └── routes.ts
│   │   ├── notes/              # 书签/笔记
│   │   │   └── routes.ts
│   │   ├── search/             # 全文搜索
│   │   │   └── routes.ts
│   │   └── sync/               # 多端增量同步
│   │       └── routes.ts
│   │
│   ├── repositories/          # 数据访问抽象（切库不改业务代码）
│   │   ├── userRepo.ts
│   │   ├── bookRepo.ts
│   │   ├── bookshelfRepo.ts
│   │   ├── progressRepo.ts
│   │   └── noteRepo.ts
│   │
│   ├── middleware/            # 中间件
│   │   ├── auth.ts            # 鉴权（requireAuth/optionalAuth/requireAdmin）
│   │   ├── error.ts           # 全局错误处理
│   │   └── logger.ts          # 请求日志
│   │
│   └── utils/                 # 工具函数
│       ├── uuid.ts            # UUID 生成
│       ├── password.ts        # bcrypt 哈希/验证
│       ├── jwt.ts             # JWT 签发/验证
│       ├── response.ts        # 统一响应封装
│       └── errors.ts          # 自定义错误类
│
├── data/                      # sqlite 文件目录（gitignore）
│   ├── book_library.db
│   └── book_library.db-wal    # WAL 模式文件
│
├── Dockerfile                 # 多阶段构建（builder + runner）
├── package.json
├── tsconfig.json
└── .npmrc                     # npm registry 配置
```

### 2.1 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                         HTTP 请求                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  路由层（modules/*/routes.ts）                                │
│  · 解析请求参数（query / body / param）                        │
│  · Zod 校验入参                                              │
│  · 调用 Repository                                           │
│  · 返回统一响应                                               │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Repository 层（repositories/*Repo.ts）                       │
│  · 封装数据库查询逻辑                                         │
│  · 业务代码不直接碰 DB                                        │
│  · 切库只需换实现，业务代码不动                                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  ORM 层（Drizzle）                                           │
│  · 类型安全的查询构建器                                        │
│  · SQL 生成与执行                                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  数据库层（SQLite / PostgreSQL）                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 数据库设计

### 3.1 ER 图

```
┌──────────┐       ┌──────────────┐       ┌──────────┐
│  users   │       │ bookshelves  │       │  books   │
├──────────┤       ├──────────────┤       ├──────────┤
│ id (PK)  │──┐    │ id (PK)      │    ┌──│ id (PK)  │
│ username │  │    │ user_id (FK) │    │  │ title    │
│ email    │  │    │ name         │    │  │ author   │
│ password │  │    └──────┬───────┘    │  │ category │
│ role     │  │           │            │  │ ...      │
└──────────┘  │           │            │  └──────────┘
              │           │            │
              │    ┌──────┴───────┐    │
              │    │bookshelf_    │    │
              │    │items         │    │
              │    ├──────────────┤    │
              │    │ id (PK)      │    │
              │    │bookshelf_id  │────┘
              │    │book_id (FK)  │
              │    └──────────────┘
              │
              │    ┌──────────────────┐
              ├───▶│ reading_progress │
              │    ├──────────────────┤
              │    │ id (PK)          │
              │    │ user_id (FK)     │
              │    │ book_id (FK)     │
              │    │ chapter          │
              │    │ page             │
              │    │ percentage       │
              │    │ last_position    │
              │    └──────────────────┘
              │
              │    ┌──────────────┐
              └───▶│    notes     │
                   ├──────────────┤
                   │ id (PK)      │
                   │ user_id (FK) │
                   │ book_id (FK) │
                   │ type         │
                   │ content      │
                   └──────────────┘
```

### 3.2 表结构详解

#### users（用户表）

```typescript
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),                                    // UUID
  username: text('username').notNull().unique(),                  // 唯一用户名
  email: text('email').notNull().unique(),                        // 唯一邮箱
  passwordHash: text('password_hash').notNull(),                  // bcrypt 哈希
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});
```

**设计要点**：
- `passwordHash` 存 bcrypt 哈希，**永不存明文**
- `role` 用 enum 约束，只有 `user` / `admin` 两个值
- 时间戳用 `text` 存 ISO 8601 字符串（SQLite 无原生 datetime 类型）

#### books（书籍表）

```typescript
export const books = sqliteTable('books', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  author: text('author').notNull().default(''),
  coverUrl: text('cover_url').notNull().default(''),
  description: text('description').notNull().default(''),
  category: text('category').notNull().default('其他'),
  totalChapters: integer('total_chapters').notNull().default(0),
  totalPages: integer('total_pages').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  categoryIdx: index('books_category_idx').on(t.category),   // 分类筛选索引
  titleIdx: index('books_title_idx').on(t.title),           // 标题搜索索引
}));
```

**设计要点**：
- `category` 加索引——分类筛选是高频操作
- `title` 加索引——关键词搜索是高频操作
- `totalChapters` / `totalPages` 用于进度百分比计算

#### bookshelves（书架表）

```typescript
export const bookshelves = sqliteTable('bookshelves', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),      // 级联删除
  name: text('name').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  userIdx: index('bookshelves_user_idx').on(t.userId),        // 按用户查书架
}));
```

#### bookshelf_items（书架条目，多对多关联表）

```typescript
export const bookshelfItems = sqliteTable('bookshelf_items', {
  id: text('id').primaryKey(),
  bookshelfId: text('bookshelf_id').notNull()
    .references(() => bookshelves.id, { onDelete: 'cascade' }),
  bookId: text('book_id').notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  uniquePair: uniqueIndex('bookshelf_items_unique').on(t.bookshelfId, t.bookId),  // 防重复
  bookIdx: index('bookshelf_items_book_idx').on(t.bookId),
}));
```

**设计要点**：
- `uniqueIndex` 保证同一本书不会重复出现在同一个书架
- 一本书可以入多个书架（多对多）

#### reading_progress（阅读进度表）

```typescript
export const readingProgress = sqliteTable('reading_progress', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  bookId: text('book_id').notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  chapter: integer('chapter').notNull().default(0),
  page: integer('page').notNull().default(0),
  percentage: text('percentage').notNull().default('0'),     // 字符串保精度
  lastPosition: text('last_position').notNull().default(''), // EPUB CFI / 位置标记
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  uniqueUserBook: uniqueIndex('progress_user_book_unique').on(t.userId, t.bookId),
  userIdx: index('progress_user_idx').on(t.userId),
}));
```

**设计要点**：
- `(user_id, book_id)` 唯一索引——一个用户对一本书只有一条进度
- `percentage` 用 `text` 而非 `real`——避免浮点精度丢失（`0.1 + 0.2 !== 0.3`）
- `last_position` 存 EPUB CFI 或纯文本位置——阅读引擎用
- `updatedAt` 是增量同步的核心字段

#### notes（笔记/书签表）

```typescript
export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  bookId: text('book_id').notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
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
```

### 3.3 索引策略

| 索引名 | 表 | 字段 | 用途 |
|---|---|---|---|
| books_category_idx | books | category | 分类筛选 |
| books_title_idx | books | title | 标题搜索 |
| bookshelves_user_idx | bookshelves | user_id | 按用户查书架 |
| bookshelf_items_unique | bookshelf_items | (bookshelf_id, book_id) | 防重复 |
| bookshelf_items_book_idx | bookshelf_items | book_id | 按书查书架 |
| progress_user_book_unique | reading_progress | (user_id, book_id) | upsert 依据 |
| progress_user_idx | reading_progress | user_id | 按用户查进度 |
| notes_user_idx | notes | user_id | 按用户查笔记 |
| notes_book_idx | notes | book_id | 按书查笔记 |

**原则**：只给高频查询字段加索引。索引占内存、减慢写入，不滥用。

---

## 4. 数据库连接层

### 4.1 连接管理（`db/index.ts`）

```typescript
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as schema from './schema.js';

export type DB = BetterSQLite3Database<typeof schema>;

let _db: DB | null = null;  // 单例

export function getDB(): DB {
  if (_db) return _db;

  if (config.db.driver === 'sqlite') {
    mkdirSync(dirname(config.db.sqlitePath), { recursive: true });
    const sqlite = new Database(config.db.sqlitePath);
    sqlite.pragma('journal_mode = WAL');     // 写前日志，读写并发
    sqlite.pragma('foreign_keys = ON');      // 强制外键约束
    _db = drizzle(sqlite, { schema });
  } else {
    // PostgreSQL 切换点
    throw new Error('Postgres driver not wired yet.');
  }
  return _db;
}
```

### 4.2 WAL 模式

SQLite 默认是 **rollback journal**（写时阻塞读），WAL（Write-Ahead Logging）模式允许读写并发：

```
rollback journal 模式：
  写操作 ──────▶ 阻塞所有读操作 ──────▶ 写完成 ──────▶ 读恢复

WAL 模式：
  读操作 ──────────────────────────────▶ 不受影响
  写操作 ──────▶ 追加到 .db-wal 文件 ──▶ 后台合并
```

**好处**：Web 服务读多写少，WAL 大幅提升并发读性能。

### 4.3 切 PostgreSQL 的步骤

1. `.env` 改 `DB_DRIVER=postgres` + `DATABASE_URL=postgres://user:pass@host:5432/db`
2. `db/index.ts` 把 `throw` 换成：
   ```typescript
   import { drizzle } from 'drizzle-orm/node-postgres';
   import pg from 'pg';
   const pool = new pg.Pool({ connectionString: config.db.url, max: 5 });
   _db = drizzle(pool, { schema });
   ```
3. `schema.ts` 把 `sqliteTable` 换成 `pgTable`（API 几乎一样）
4. 安装 `pg` + `@types/pg`

**Repository 层完全不用改**——业务代码只依赖 Repository 接口。

---

## 5. Repository 模式

### 5.1 什么是 Repository 模式

Repository 是**数据访问层**，封装所有数据库查询逻辑。业务代码通过 Repository 访问数据，不直接碰数据库。

```
业务代码 ──▶ Repository 接口 ──▶ 具体实现（SQLite / PostgreSQL）
                                  ↑
                           切库只需换实现
```

### 5.2 为什么用 Repository 模式

| 好处 | 说明 |
|---|---|
| 解耦 | 业务逻辑与数据库实现分离 |
| 可测试 | 可以 mock Repository 做单元测试 |
| 可替换 | 切 PostgreSQL 只需新增一个实现，业务代码不动 |
| 可维护 | 所有 SQL 集中在 Repository，不散落在业务代码 |

### 5.3 实现示例

#### bookRepo.ts

```typescript
export interface CreateBookInput {
  title: string;
  author?: string;
  coverUrl?: string;
  description?: string;
  category?: string;
  totalChapters?: number;
  totalPages?: number;
}

export interface ListBooksOptions {
  page?: number;
  pageSize?: number;
  category?: string;
  keyword?: string;
  sort?: 'newest' | 'popular' | 'title';
}

export const bookRepo = {
  db: getDB(),

  async create(input: CreateBookInput) {
    const id = newId();
    await this.db.insert(schema.books).values({
      id,
      title: input.title,
      author: input.author || '',
      coverUrl: input.coverUrl || '',
      description: input.description || '',
      category: input.category || '其他',
      totalChapters: input.totalChapters || 0,
      totalPages: input.totalPages || 0,
    });
    return this.findById(id);
  },

  async findById(id: string) {
    const rows = await this.db.select().from(schema.books)
      .where(eq(schema.books.id, id)).limit(1);
    return rows[0] || null;
  },

  async update(id: string, input: UpdateBookInput) {
    const patch: Record<string, unknown> = { updatedAt: sql`(datetime('now'))` };
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined) patch[k] = v;
    }
    await this.db.update(schema.books).set(patch).where(eq(schema.books.id, id));
    return this.findById(id);
  },

  async remove(id: string) {
    await this.db.delete(schema.books).where(eq(schema.books.id, id));
  },

  async list(opts: ListBooksOptions) {
    const page = Math.max(1, opts.page || 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize || 20));
    const offset = (page - 1) * pageSize;

    const conds: SQL[] = [];
    if (opts.category) conds.push(eq(schema.books.category, opts.category));
    if (opts.keyword) conds.push(like(schema.books.title, `%${opts.keyword}%`));
    const where = conds.length ? and(...conds) : undefined;

    const orderBy = opts.sort === 'title' ? schema.books.title : desc(schema.books.createdAt);

    const [rows, countRows] = await Promise.all([
      this.db.select().from(schema.books).where(where).orderBy(orderBy).limit(pageSize).offset(offset),
      this.db.select({ count: sql<number>`count(*)` }).from(schema.books).where(where),
    ]);

    return { items: rows, total: Number(countRows[0]?.count || 0), page, pageSize };
  },

  async listCategories() {
    const rows = await this.db
      .select({ category: schema.books.category, count: sql<number>`count(*)` })
      .from(schema.books)
      .groupBy(schema.books.category);
    return rows.map(r => ({ category: r.category, count: Number(r.count) }));
  },
};
```

#### progressRepo.ts（upsert 逻辑）

```typescript
export interface UpsertProgressInput {
  chapter?: number;
  page?: number;
  percentage?: string;
  lastPosition?: string;
}

export const progressRepo = {
  db: getDB(),

  async upsert(userId: string, bookId: string, input: UpsertProgressInput) {
    const existing = await this.db.select().from(schema.readingProgress)
      .where(and(
        eq(schema.readingProgress.userId, userId),
        eq(schema.readingProgress.bookId, bookId)
      )).limit(1);

    const patch: Record<string, unknown> = { updatedAt: sql`(datetime('now'))` };
    if (input.chapter !== undefined) patch.chapter = input.chapter;
    if (input.page !== undefined) patch.page = input.page;
    if (input.percentage !== undefined) patch.percentage = input.percentage;
    if (input.lastPosition !== undefined) patch.lastPosition = input.lastPosition;

    if (existing[0]) {
      // 有记录 → 更新
      await this.db.update(schema.readingProgress).set(patch)
        .where(eq(schema.readingProgress.id, existing[0].id));
    } else {
      // 无记录 → 插入
      const id = newId();
      await this.db.insert(schema.readingProgress).values({
        id, userId, bookId,
        chapter: input.chapter || 0,
        page: input.page || 0,
        percentage: input.percentage || '0',
        lastPosition: input.lastPosition || '',
      });
    }
    return this.findByUserAndBook(userId, bookId);
  },

  async updatedSince(userId: string, since: string) {
    return this.db.select().from(schema.readingProgress)
      .where(and(
        eq(schema.readingProgress.userId, userId),
        sql`${schema.readingProgress.updatedAt} > ${since}`
      ));
  },
};
```

### 5.4 Repository 清单

| Repository | 职责 | 关键方法 |
|---|---|---|
| `userRepo` | 用户 CRUD | `create`, `findById`, `findByAccount`, `exists` |
| `bookRepo` | 书籍 CRUD | `create`, `findById`, `update`, `remove`, `list`, `listCategories` |
| `bookshelfRepo` | 书架 CRUD | `create`, `listByUser`, `addBook`, `removeBook`, `listBooks` |
| `progressRepo` | 阅读进度 | `upsert`, `findByUserAndBook`, `listByUser`, `updatedSince` |
| `noteRepo` | 笔记/书签 | `create`, `listByUser`, `update`, `remove`, `updatedSince` |

---

## 6. 业务模块与 API 接口

### 6.1 模块清单

| 模块 | 路由前缀 | 功能 |
|---|---|---|
| auth | `/api/auth` | 注册、登录、登出、获取当前用户、刷新 token |
| books | `/api/books` | 书籍列表、详情、分类、CRUD（管理员） |
| bookshelf | `/api/bookshelves` | 书架 CRUD、书架书籍管理 |
| progress | `/api/progress` | 阅读进度 upsert、查询 |
| notes | `/api/notes` | 笔记/书签 CRUD |
| search | `/api/search` | 全文搜索 |
| sync | `/api/sync` | 多端增量同步 |

### 6.2 API 接口详解

#### auth 模块

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/api/auth/register` | 否 | 注册新用户 |
| POST | `/api/auth/login` | 否 | 登录（用户名或邮箱） |
| POST | `/api/auth/logout` | 否 | 登出（客户端丢弃 token） |
| GET | `/api/auth/me` | 是 | 获取当前用户信息 |
| POST | `/api/auth/refresh` | 是 | 刷新 token |

**注册请求**：
```json
POST /api/auth/register
Content-Type: application/json

{
  "username": "youverus",
  "email": "youveritas@163.com",
  "password": "your-strong-password"
}
```

**注册响应**：
```json
{
  "code": 0,
  "data": {
    "user": { "id": "uuid", "username": "youverus", "email": "...", "role": "user" },
    "token": "eyJhbGciOiJIUzI1NiJ9..."
  },
  "message": "ok"
}
```

#### books 模块

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/api/books` | 可选 | 书籍列表（分页/分类/排序/关键词） |
| GET | `/api/books/categories` | 否 | 分类列表 |
| GET | `/api/books/:id` | 否 | 书籍详情 |
| POST | `/api/books` | 管理员 | 新增书籍 |
| PUT | `/api/books/:id` | 管理员 | 更新书籍 |
| DELETE | `/api/books/:id` | 管理员 | 删除书籍 |

**列表查询参数**：
```
GET /api/books?page=1&pageSize=20&category=科幻&sort=newest&keyword=三体
```

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| page | number | 1 | 页码 |
| pageSize | number | 20 | 每页数量（最大 100） |
| category | string | - | 分类筛选 |
| sort | string | newest | newest / popular / title |
| keyword | string | - | 关键词搜索（标题） |

#### bookshelf 模块

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/api/bookshelves` | 是 | 当前用户的书架列表 |
| POST | `/api/bookshelves` | 是 | 创建书架 |
| PUT | `/api/bookshelves/:id` | 是 | 重命名书架 |
| DELETE | `/api/bookshelves/:id` | 是 | 删除书架 |
| GET | `/api/bookshelves/:id/books` | 是 | 书架中的书籍列表 |
| POST | `/api/bookshelves/:id/books` | 是 | 添加书到书架 |
| DELETE | `/api/bookshelves/:id/books/:bookId` | 是 | 从书架移除书 |

#### progress 模块

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/api/progress` | 是 | 当前用户所有进度 |
| GET | `/api/progress/:bookId` | 是 | 某本书的进度 |
| PUT | `/api/progress/:bookId` | 是 | 更新进度（upsert） |

**更新进度请求**：
```json
PUT /api/progress/book_001
Authorization: Bearer xxx
Content-Type: application/json

{
  "chapter": 5,
  "page": 142,
  "percentage": "0.394",
  "last_position": "cfi=/6/142"
}
```

#### notes 模块

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/api/notes` | 是 | 笔记列表（可按 bookId/type 筛选） |
| POST | `/api/notes` | 是 | 创建笔记/书签 |
| PUT | `/api/notes/:id` | 是 | 更新笔记 |
| DELETE | `/api/notes/:id` | 是 | 删除笔记 |

#### search 模块

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/api/search?q=xxx` | 否 | 全文搜索（标题/作者/描述） |

#### sync 模块

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/api/sync?since=xxx` | 是 | 增量同步（进度/笔记/书架） |

**增量同步响应**：
```json
{
  "code": 0,
  "data": {
    "progress": [
      { "bookId": "book_001", "chapter": 5, "percentage": "0.394", "updatedAt": "..." }
    ],
    "notes": [
      { "id": "...", "bookId": "book_001", "content": "...", "updatedAt": "..." }
    ],
    "bookshelves": {
      "shelves": [{ "id": "...", "name": "想读", "updatedAt": "..." }],
      "items": [{ "bookshelfId": "...", "bookId": "...", "createdAt": "..." }]
    },
    "syncTime": "2026-08-23T10:00:00Z"
  },
  "message": "ok"
}
```

**客户端同步流程**：
1. 本地存 `last_synced_at`
2. 调用 `GET /api/sync?since=<last_synced_at>`
3. 合并变更到本地
4. 更新 `last_synced_at` 为响应的 `syncTime`

---

## 7. 中间件系统

### 7.1 中间件清单

| 中间件 | 文件 | 作用 | 注册方式 |
|---|---|---|---|
| errorHandler | `middleware/error.ts` | 全局异常捕获，统一错误格式 | `app.use('*', ...)` |
| requestLogger | `middleware/logger.ts` | 请求日志（method/url/status/耗时） | `app.use('*', ...)` |
| cors | hono/cors | 跨域头 | `app.use('*', ...)` |
| requireAuth | `middleware/auth.ts` | 必须登录 | 路由级 |
| optionalAuth | `middleware/auth.ts` | 可选登录 | 路由级 |
| requireAdmin | `middleware/auth.ts` | 必须管理员 | 路由级 |

### 7.2 错误处理中间件

```typescript
export function errorHandler() {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (err) {
      if (err instanceof ZodError) {
        return httpError(c, 400, err.issues.map(i => i.message).join('; '));
      }
      if (err instanceof AppError) {
        return httpError(c, err.code, err.message, err.status);
      }
      console.error('[unhandled error]', err);
      return httpError(c, 500, '服务器内部错误');
    }
  };
};
```

**错误类型映射**：

| 错误类型 | HTTP 状态码 | 业务码 | 场景 |
|---|---|---|---|
| ZodError | 200 | 400 | 参数校验失败 |
| AppError(401) | 200 | 401 | 未登录 |
| AppError(403) | 200 | 403 | 无权限 |
| AppError(404) | 200 | 404 | 资源不存在 |
| AppError(409) | 200 | 409 | 资源冲突 |
| 未知错误 | 200 | 500 | 服务器内部错误 |

> **注意**：当前实现统一返回 HTTP 200 + 业务码，前端通过 `code` 字段判断。更规范的 RESTful 做法是 HTTP 状态码与业务码一致（如 401、403、404），这是已知 TODO。

### 7.3 请求日志中间件

```typescript
export function requestLogger() {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`${c.req.method} ${c.req.url} -> ${c.res.status} ${ms}ms`);
  };
};
```

**输出示例**：
```
POST /api/auth/login -> 200 57ms
GET  /api/books?page=1&pageSize=3 -> 200 2ms
GET  /api/bookshelves -> 200 1ms
```

### 7.4 鉴权中间件

```typescript
export async function requireAuth(c: Context<AuthState>, next: Next) {
  const header = c.req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return httpError(c, 401, '未登录');
  const payload = await verifyToken(token);
  if (!payload) return httpError(c, 401, 'token 失效或已过期');
  c.set('user', payload);
  await next();
}
```

**三种鉴权强度**：

```typescript
// 必须登录
app.get('/api/bookshelves', requireAuth, handler);

// 可选登录（有 token 就注入 user，没有就跳过）
app.get('/api/books', optionalAuth, handler);

// 必须管理员（跟在 requireAuth 后面）
app.post('/api/books', requireAuth, requireAdmin, handler);
```

---

## 8. 鉴权与权限控制

### 8.1 JWT 实现

#### 签发（`utils/jwt.ts`）

```typescript
import { SignJWT, jwtVerify } from 'jose';

const secretKey = new TextEncoder().encode(config.jwt.secret);

export interface JwtPayload {
  sub: string;       // 用户 ID
  username: string;  // 用户名
  role: string;      // 角色（user / admin）
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(config.jwt.expiresIn)  // 默认 7d
    .sign(secretKey);
}
```

#### 验证

```typescript
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      sub: String(payload.sub),
      username: String(payload.username),
      role: String(payload.role)
    };
  } catch {
    return null;  // token 失效/过期/篡改
  }
}
```

### 8.2 密码安全

```typescript
// utils/password.ts
import bcrypt from 'bcryptjs';

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);
```

**bcrypt cost=10**：约 100ms 计算时间，暴力破解成本极高。

### 8.3 角色权限矩阵

| 操作 | 普通用户 | 管理员 |
|---|---|---|
| 注册/登录 | ✅ | ✅ |
| 查看书籍列表/详情 | ✅ | ✅ |
| 搜索 | ✅ | ✅ |
| 管理自己的书架 | ✅ | ✅ |
| 管理自己的进度/笔记 | ✅ | ✅ |
| 新增/编辑/删除书籍 | ❌ | ✅ |

### 8.4 数据隔离

**核心原则**：所有业务表都有 `userId` 字段，Repository 层强制按 `userId` 过滤。

```typescript
// ✅ 正确：从 JWT 取 userId，前端无法伪造
bookshelfRoutes.get('/', requireAuth, async c => {
  const userId = c.get('user').sub;
  const shelves = await bookshelfRepo.listByUser(userId);
  return ok(c, shelves);
});
```

**效果**：
- 用户 A 调用 `GET /api/bookshelves` → 只看到自己的书架
- 用户 B 调用 `GET /api/bookshelves` → 只看到自己的书架
- A 无法通过任何接口读到 B 的数据

---

## 9. 错误处理

### 9.1 统一响应格式

```json
{
  "code": 0,           // 业务错误码（0=成功）
  "data": { ... },     // 响应数据
  "message": "ok"      // 提示信息
}
```

### 9.2 自定义错误类

```typescript
// utils/errors.ts
export class AppError extends Error {
  constructor(public code: number, message: string, public status = 200) {
    super(message);
  }
}

// 业务代码里抛出
throw new AppError(409, '用户名已存在');
throw new AppError(401, '账号或密码错误');
throw new AppError(404, '书籍不存在');
```

### 9.3 Zod 校验

所有入参都经过 Zod schema 校验：

```typescript
const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6).max(64),
});

// 校验失败自动返回 400 + 具体错误信息
const parsed = registerSchema.safeParse(body);
if (!parsed.success) throw new AppError(400, parsed.error.issues.map(i => i.message).join('; '));
```

**校验失败响应**：
```json
{
  "code": 400,
  "data": null,
  "message": "String must contain at least 3 character(s); Invalid email"
}
```

---

## 10. 请求生命周期

### 10.1 完整流程（以 `POST /api/auth/login` 为例）

```
请求进来
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│  errorHandler 中间件                                         │
│  try {                                                      │
│    await next();  ──┐                                       │
│  } catch (err) {    │                                       │
│    统一错误返回      │                                       │
│  }                  │                                       │
└─────────────────────┼───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  requestLogger 中间件                                        │
│  const start = Date.now();                                  │
│  await next();  ──┐                                         │
│  console.log(`${method} ${url} -> ${status} ${ms}ms`);      │
└───────────────────┼─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  CORS 中间件                                                  │
│  添加 Access-Control-* 头                                     │
│  await next();                                               │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  路由匹配 → authRoutes.post('/login', handler)                │
│                                                              │
│  handler 执行：                                               │
│  1. Zod 校验 body                                            │
│  2. userRepo.findByAccount(account)                          │
│  3. verifyPassword(password, hash)                           │
│  4. signToken({ sub, username, role })                       │
│  5. return ok(c, { user, token })                            │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
              响应出去（原路返回）
```

### 10.2 异常流程

```
handler 抛出 AppError(401, '账号或密码错误')
  │
  ▼
errorHandler 的 catch 捕获
  │
  ▼
return httpError(c, 401, '账号或密码错误')
  │
  ▼
requestLogger 的 next() 之后执行
  console.log('POST /api/auth/login -> 200 45ms')
  │
  ▼
响应：{ "code": 401, "data": null, "message": "账号或密码错误" }
```

---

## 11. 部署配置

### 11.1 环境变量（`.env`）

```dotenv
# 后端
BACKEND_PORT=8000
JWT_SECRET=your-long-random-string-at-least-32-chars
TOKEN_EXPIRES_IN=7d
DB_DRIVER=sqlite
SQLITE_PATH=/app/data/book_library.db

# PostgreSQL（DB_DRIVER=postgres 时启用）
# DATABASE_URL=postgres://user:pass@host:5432/book_library
```

### 11.2 Dockerfile

```dockerfile
# 构建阶段
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build    # tsc 编译 → dist/

# 运行阶段
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/data
VOLUME ["/app/data"]
EXPOSE 8000
CMD ["node", "dist/index.js"]
```

**多阶段构建的好处**：
- 最终镜像只包含运行依赖（不含 TypeScript 源码、devDependencies）
- 镜像体积从 ~500MB 降到 ~150MB
- 启动更快（无需编译）

### 11.3 启动命令

```bash
# 开发模式（tsx watch，热重载）
npm run dev

# 生产模式（先编译，再运行）
npm run build && npm start

# 数据库迁移
npm run migrate

# 种子数据
npm run seed
```

### 11.4 Docker Compose 中的后端服务

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  container_name: bl-backend
  restart: unless-stopped
  environment:
    - NODE_ENV=production
    - DB_DRIVER=sqlite
    - SQLITE_PATH=/app/data/book_library.db
    - JWT_SECRET=${JWT_SECRET}
  volumes:
    - bl_data:/app/data    # 数据库文件持久化
  expose:
    - "8000"               # 只暴露给 nginx，不暴露给宿主机
  networks:
    - bl_net
  healthcheck:
    test: ["CMD", "node", "-e", "fetch('http://localhost:8000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
    interval: 30s
    timeout: 5s
    retries: 3
```

---

## 12. 扩展性设计

### 12.1 数据库切换（SQLite → PostgreSQL）

**步骤**：
1. `.env` 改 `DB_DRIVER=postgres` + `DATABASE_URL=postgres://...`
2. `db/index.ts` 把 `throw` 换成 node-postgres 驱动
3. `schema.ts` 把 `sqliteTable` 换成 `pgTable`
4. 安装 `pg` + `@types/pg`

**Repository 层完全不用改**——业务代码只依赖 Repository 接口。

### 12.2 功能模块化

每个业务模块自包含（路由 + service + repo），新增功能只需：

1. 在 `modules/` 下新建目录
2. 在 `app.ts` 注册路由
3. 在 `db/schema.ts` 加表 + 迁移

### 12.3 未来扩展方向

| 扩展 | 实现方式 |
|---|---|
| EPUB/PDF 解析 | 独立微服务，解析后存章节表 |
| 推荐系统 | 离线批处理，结果写缓存表 |
| 评论系统 | 独立模块，树形结构存储 |
| 搜索升级 | SQLite FTS5 → Meilisearch/Elasticsearch |
| 缓存 | Redis 缓存热点数据（书籍列表、用户信息） |
| 消息队列 | RabbitMQ/Kafka 处理异步任务（邮件/通知） |
| 文件上传 | 独立模块，OSS 存储 + 格式校验 |
| API 文档 | Swagger/OpenAPI 自动生成 |

### 12.4 2G 内存优化

| 组件 | 内存占用 | 优化策略 |
|---|---|---|
| OS + 基础服务 | ~300MB | - |
| Nginx | ~20MB | 静态资源直接托管 |
| 后端 Hono | ~80-150MB | 单进程，不启用 cluster |
| 前端 Next.js | ~150-300MB | standalone 模式，Nginx 托管静态 |
| SQLite | ~50MB | WAL 模式，单连接 |
| **剩余** | **~1.2GB+** | 峰值缓冲 |

---

## 13. 已知 TODO

| 优先级 | 项目 | 说明 |
|---|---|---|
| P1 | owner 校验 | 当前依赖 UUID 不可猜，但生产环境应显式校验资源归属 |
| P1 | HTTP 状态码规范化 | 当前统一返回 HTTP 200 + 业务码，应改为 HTTP 401/403/404 |
| P1 | 请求限流 | Nginx 层已配置，后端层待加令牌桶 |
| P1 | Swagger 文档 | 手写 api.md 已够用，可加 OpenAPI 自动生成 |
| P2 | CSRF 防护 | 当前用 JWT + CORS，可加 CSRF token |
| P2 | 文件上传 | 书评图片、书籍封面需走 OSS |
| P2 | Redis 缓存 | PostgreSQL 场景再加 |
| P2 | 消息队列 | 用户量小时不需要 |
| P2 | 单元测试 | Repository 层可 mock DB 做测试 |
| P2 | 集成测试 | 端到端 API 测试 |

---

## 附录：工具函数

### uuid.ts

```typescript
import { randomUUID } from 'node:crypto';
export const newId = () => randomUUID();
```

### response.ts

```typescript
import type { Context } from 'hono';

export function ok(c: Context, data: unknown, message = 'ok') {
  return c.json({ code: 0, data, message });
}

export function fail(c: Context, code: number, message: string, httpStatus = 200) {
  return c.json({ code, data: null, message }, httpStatus);
}

export function httpError(c: Context, status: number, message: string) {
  return c.json({ code: status, data: null, message }, status);
}
```

### config.ts

```typescript
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
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.TOKEN_EXPIRES_IN || '7d',
  },
  db: {
    driver: (process.env.DB_DRIVER || 'sqlite') as 'sqlite' | 'postgres',
    sqlitePath: process.env.SQLITE_PATH || resolve(process.cwd(), 'data', 'book_library.db'),
    url: process.env.DATABASE_URL || '',
  },
  isProd: process.env.NODE_ENV === 'production',
};
```
