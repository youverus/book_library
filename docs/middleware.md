# Book Library — 中间件实现详解

> 本文档详细说明 Book Library 后端中间件的设计原理、每个中间件的完整实现代码、执行流程，以及如何扩展自定义中间件。所有代码片段均与 `backend/src/` 当前实现一一对应。

---

## 目录

1. [中间件概念](#1-中间件概念)
2. [Hono 的中间件模型](#2-hono-的中间件模型)
3. [全局中间件注册](#3-全局中间件注册)
4. [中间件一：错误处理](#4-中间件一错误处理)
5. [中间件二：请求日志](#5-中间件二请求日志)
6. [中间件三：鉴权](#6-中间件三鉴权)
6.5 [中间件四：CORS](#65-中间件四cors)
7. [中间件执行流程全景](#7-中间件执行流程全景)
8. [如何扩展自定义中间件](#8-如何扩展自定义中间件)
9. [常见场景示例](#9-常见场景示例)
10. [最佳实践](#10-最佳实践)

---

## 1. 中间件概念

### 1.1 什么是中间件

中间件（Middleware）是**请求到达最终处理函数之前/之后执行的一层处理逻辑**。它位于 HTTP 请求与业务处理器之间，能对请求进行预处理、拦截、增强，或对响应进行后处理。

```
浏览器发请求
      │
      ▼
┌─────────────────────────────────┐
│         中间件层                  │
│  ┌───────────────────────────┐  │
│  │       中间件 1              │  │
│  │  ┌─────────────────────┐  │  │
│  │  │     中间件 2          │  │  │
│  │  │  ┌───────────────┐  │  │  │
│  │  │  │  中间件 3      │  │  │  │
│  │  │  │  ┌─────────┐  │  │  │  │
│  │  │  │  │ 业务处理器 │  │  │  │  │
│  │  │  │  └─────────┘  │  │  │  │
│  │  │  └───────────────┘  │  │  │
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
      │
      ▼
返回响应给浏览器
```

### 1.2 中间件能干什么

| 能力 | 说明 | 本项目示例 |
|---|---|---|
| 拦截 | 直接返回响应，不再往下走 | 未登录返回 401 |
| 透传 | 调 `next()` 让下一层继续 | 验证通过后放行 |
| 预处理 | `next()` 之前做准备工作 | 解析 JWT、注入用户信息 |
| 后处理 | `next()` 之后做收尾工作 | 计算耗时、记录日志 |
| 异常捕获 | `try/catch` 包住 `next()` | 统一错误处理 |

### 1.3 为什么需要中间件

- **关注点分离**：鉴权、日志、错误处理从业务代码里剥离
- **复用**：一个中间件可以挂到多个路由
- **声明式**：路由定义时标注需要什么中间件，一目了然
- **可组合**：多个中间件叠加，各司其职

---

## 2. Hono 的中间件模型

### 2.1 核心 API

Hono 的中间件是一个异步函数，接收两个参数：

```typescript
// c: Context（上下文，包含请求和响应）
// next: 调用后把控制权交给下一层
app.use('*', async (c: Context, next: Next) => {
  // next() 之前：请求阶段
  await next();
  // next() 之后：响应阶段
});
```

### 2.2 洋葱模型

请求从最外层中间件进入，逐层向内传递，到达业务处理器后，响应再逐层向外返回。

```
请求 → 中间件A（前） → 中间件B（前） → 处理器 → 中间件B（后） → 中间件A（后） → 响应
```

### 2.3 路径匹配

```typescript
// 匹配所有路由
app.use('*', middleware);

// 只匹配 /api 开头的路由
app.use('/api/*', middleware);

// 只匹配精确路径
app.use('/api/health', middleware);
```

### 2.4 Context 上下文

`Context`（简称 `c`）是贯穿整个请求生命周期的对象：

```typescript
c.req.method        // HTTP 方法
c.req.url           // 请求 URL
c.req.header('X')   // 请求头
c.req.json()        // 解析 JSON body
c.res.status        // 响应状态码（next() 之后可读）
c.set('key', value) // 存数据，下游能拿到
c.get('key')        // 取数据
c.json(obj, status) // 返回 JSON 响应
c.env               // 环境变量（Bindings）
```

---

## 3. 全局中间件注册

所有中间件在 `src/app.ts` 里统一注册：

```typescript
// src/app.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './middleware/error.js';
import { requestLogger } from './middleware/logger.js';
import { authRoutes } from './modules/auth/routes.js';

export function createApp() {
  const app = new Hono();

  // ① 错误处理（最外层，能捕获所有下游异常）
  app.use('*', errorHandler());

  // ② 请求日志
  app.use('*', requestLogger());

  // ③ 跨域（Hono 内建中间件）
  app.use('*', cors({
    origin: ['http://localhost:3000'],
    credentials: true,
  }));

  // ④ 路由（路由上可挂局部中间件）
  app.route('/api/auth', authRoutes);
  app.route('/api/books', bookRoutes);

  return app;
}
```

**注册顺序就是执行顺序**：errorHandler 包在最外面，能捕获 logger、cors、路由里抛出的所有异常。

---

## 4. 中间件一：错误处理

### 4.1 源码

```typescript
// src/middleware/error.ts
import type { Context, Next } from 'hono';
import { httpError } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { ZodError } from 'zod';

export function errorHandler() {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (err) {
      // Zod 参数校验失败 → 400
      if (err instanceof ZodError) {
        return httpError(c, 400, err.issues.map(i => i.message).join('; '));
      }
      // 自定义业务异常 → 指定 code
      if (err instanceof AppError) {
        return httpError(c, err.code, err.message, err.status);
      }
      // 未知异常 → 500（生产环境不应暴露细节）
      console.error('[unhandled error]', err);
      return httpError(c, 500, '服务器内部错误');
    }
  };
}
```

### 4.2 依赖：自定义错误类

```typescript
// src/utils/errors.ts
export class AppError extends Error {
  constructor(
    public code: number,    // 业务错误码
    message: string,        // 错误提示
    public status = 200     // HTTP 状态码（默认 200，响应体里用 code 区分）
  ) {
    super(message);
  }
}
```

### 4.3 依赖：响应工具

```typescript
// src/utils/response.ts
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

> **说明**：`ok` 用于成功响应，`httpError` 用于错误处理中间件（HTTP 状态码 = 业务错误码），`fail` 是备选工具用于"HTTP 200 但业务错误码非 0"的场景（当前代码中暂未使用，保留供扩展）。

### 4.4 使用示例

业务代码只管抛异常，不用每个接口写 try/catch：

```typescript
// modules/auth/routes.ts
authRoutes.post('/login', async c => {
  const user = await userRepo.findByAccount(account);
  if (!user) throw new AppError(401, '账号或密码错误');  // ← 直接 throw

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new AppError(401, '账号或密码错误');  // ← 直接 throw

  return ok(c, { user, token });
});
```

错误处理器捕获后返回：

```json
{ "code": 401, "data": null, "message": "账号或密码错误" }
```

### 4.5 Zod 校验失败的处理

参数校验抛出的 `ZodError` 也会被捕获：

```typescript
const schema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

const parsed = schema.safeParse(body);
if (!parsed.success) throw parsed.error;  // 抛出 ZodError
```

响应：

```json
{ "code": 400, "data": null, "message": "String must contain at least 3 character(s); String must contain at least 6 character(s)" }
```

---

## 5. 中间件二：请求日志

### 5.1 源码

```typescript
// src/middleware/logger.ts
import type { Context, Next } from 'hono';

export function requestLogger() {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    await next();  // ← 让请求跑完，之后才能拿到 c.res.status
    const ms = Date.now() - start;
    console.log(`${c.req.method} ${c.req.url} -> ${c.res.status} ${ms}ms`);
  };
}
```

### 5.2 输出示例

```
POST /api/auth/login -> 200 57ms
GET  /api/books?page=1&pageSize=3 -> 200 2ms
POST /api/bookshelves -> 200 1ms
PUT  /api/progress/book_001 -> 200 2ms
GET  /api/bookshelves/xxx/books -> 500 1ms  ← 异常也会记录
```

### 5.3 为什么日志在 next() 之后打

```typescript
// ❌ 错误：next() 之前拿不到响应状态码
console.log(c.res.status);  // undefined
await next();

// ✅ 正确：next() 之后 c.res.status 才有值
await next();
console.log(c.res.status);  // 200
```

### 5.4 生产环境升级建议

当前用 `console.log`，生产环境可升级为结构化日志：

```typescript
console.log(JSON.stringify({
  method: c.req.method,
  url: c.req.url,
  status: c.res.status,
  ms,
  ip: c.req.header('X-Real-IP'),
  ua: c.req.header('User-Agent'),
  time: new Date().toISOString(),
}));
```

---

## 6. 中间件三：鉴权

### 6.1 源码

```typescript
// src/middleware/auth.ts
import type { Context, Next } from 'hono';
import { verifyToken, type JwtPayload } from '../utils/jwt.js';
import { httpError } from '../utils/response.js';

// 扩展 Context 类型，让下游能拿到 user
export interface AuthState {
  Variables: { user: JwtPayload };
}

// 必须登录
export async function requireAuth(c: Context<AuthState>, next: Next) {
  const header = c.req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return httpError(c, 401, '未登录');

  const payload = await verifyToken(token);
  if (!payload) return httpError(c, 401, 'token 失效或已过期');

  c.set('user', payload);  // 注入用户信息
  await next();
}

// 可选登录（不强制，有 token 就注入 user）
export async function optionalAuth(c: Context<AuthState>, next: Next) {
  const header = c.req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token) {
    const payload = await verifyToken(token);
    if (payload) c.set('user', payload);
  }
  await next();
}

// 必须管理员（跟在 requireAuth 后面用）
export function requireAdmin(c: Context<AuthState>, next: Next) {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return httpError(c, 403, '需要管理员权限');
  }
  return next();
}
```

### 6.2 JWT 工具

```typescript
// src/utils/jwt.ts
import { SignJWT, jwtVerify } from 'jose';
import { config } from '../config.js';

const secretKey = new TextEncoder().encode(config.jwt.secret);

export interface JwtPayload {
  sub: string;      // 用户 ID
  username: string;
  role: string;     // 'user' | 'admin'
}

// 签发 token
export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(config.jwt.expiresIn)  // 默认 '7d'
    .sign(secretKey);
}

// 验证 token
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      sub: String(payload.sub),
      username: String(payload.username),
      role: String(payload.role),
    };
  } catch {
    return null;  // 过期 / 篡改 / 格式错误
  }
}
```

### 6.3 鉴权流程详解

```
请求：GET /api/bookshelves
      Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
      │
      ▼
requireAuth 中间件
      │
      ├─ 1. 取 Authorization 头
      ├─ 2. 剥掉 "Bearer " 前缀 → 拿到 raw token
      ├─ 3. token 为空？ → 返回 401 "未登录"
      ├─ 4. verifyToken 验证签名 + 过期时间
      ├─ 5. 验证失败？ → 返回 401 "token 失效或已过期"
      ├─ 6. 验证成功 → c.set('user', { sub, username, role })
      └─ 7. await next() 放行
              │
              ▼
      handler 里通过 c.get('user').sub 拿到当前用户 ID
```

### 6.4 使用方式

```typescript
// modules/bookshelf/routes.ts
export const bookshelfRoutes = new Hono<AuthState>();

// 必须登录
bookshelfRoutes.get('/', requireAuth, async c => {
  const userId = c.get('user').sub;
  const shelves = await bookshelfRepo.listByUser(userId);
  return ok(c, shelves);
});

// 必须登录 + 必须管理员
bookshelfRoutes.post('/admin/books', requireAuth, requireAdmin, async c => {
  const book = await bookRepo.create(parsed.data);
  return ok(c, book);
});

// 可选登录（公开接口也能用，登录后能看到额外信息）
bookshelfRoutes.get('/public', optionalAuth, async c => {
  const user = c.get('user');  // 可能为 undefined
  // ...
});
```

### 6.5 类型安全

`AuthState` 接口扩展了 Hono 的 Context 类型，下游 `c.get('user')` 会自动推导出 `JwtPayload` 类型，不需要手动断言：

```typescript
// ✅ TypeScript 自动推断：user 是 JwtPayload 类型
const user = c.get('user');
console.log(user.sub);      // string
console.log(user.username); // string
console.log(user.role);     // string
```

---

## 6.5 中间件四：CORS

### 6.5.1 源码

`cors` 不是手写的，来自 Hono 官方中间件 `hono/cors`。`app.ts` 中的注册方式：

```typescript
import { cors } from 'hono/cors';

app.use('*', cors({
  origin: config.isProd
    ? ['https://youhxian.cn', 'https://www.youhxian.cn']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));
```

### 6.5.2 为什么需要 CORS

前后端分离部署时，浏览器默认禁止跨域请求。本项目前端在 `localhost:3000`、后端在 `localhost:8000`（开发）或不同域名（生产），必须显式声明"允许哪些来源跨域访问"。

### 6.5.3 配置说明

| 配置项 | 值 | 作用 |
|---|---|---|
| `origin` | 数组 | 允许的来源列表。生产限制为 `youhxian.cn` 及其 `www` 子域，开发允许 `localhost:3000` / `127.0.0.1:3000` |
| `credentials` | `true` | 允许跨域请求携带 `Cookie` / `Authorization` 头（本项目 JWT 走 Bearer <REDACTED>，必须开） |

### 6.5.4 CORS 实际做了什么

浏览器发跨域请求时会先发一个 `OPTIONS` 预检请求。Hono 的 `cors` 中间件会：

1. 拦截 `OPTIONS` 请求，直接返回带 `Access-Control-Allow-Origin`、`Access-Control-Allow-Methods`、`Access-Control-Allow-Headers` 的 204 响应
2. 普通请求则在响应中补上 `Access-Control-Allow-Origin` 等头
3. 如果请求来源不在白名单内，不添加这些头，浏览器就会拦截响应

### 6.5.5 与前端 rewrite 的关系

开发模式下 `frontend/next.config.ts` 把 `/api/*` rewrite 到 `http://localhost:8000`，所以浏览器看到的是同源，**理论上不需要 CORS**。但 CORS 仍然注册是为了：

- 万一用户直接访问后端 API（比如用 Postman / curl / 第三方集成）
- 生产部署时 nginx 反代不一定同源
- 留一个"直接调后端"的逃生通道

---

## 7. 中间件执行流程全景

以 `POST /api/bookshelves`（需要登录）为例：

```
请求进来：POST /api/bookshelves
  Authorization: Bearer xxx
  Body: { "name": "想读" }
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ errorHandler（最外层）                                            │
│   try {                                                          │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ requestLogger                                            │ │
│     │   const start = Date.now()                               │ │
│     │   ┌───────────────────────────────────────────────────┐ │ │
│     │   │ cors（内建）                                        │ │ │
│     │   │   添加 Access-Control-Allow-* 响应头                │ │ │
│     │   │   OPTIONS 预检直接返回 204                          │ │ │
│     │   │   ┌─────────────────────────────────────────────┐ │ │ │
│     │   │   │ requireAuth                                  │ │ │ │
│     │   │   │   解析 Authorization 头                      │ │ │ │
│     │   │   │   verifyToken 验证 JWT                       │ │ │ │
│     │   │   │   c.set('user', payload)                     │ │ │ │
│     │   │   │   ┌───────────────────────────────────────┐ │ │ │ │
│     │   │   │   │ handler                               │ │ │ │ │
│     │   │   │   │   userId = c.get('user').sub           │ │ │ │ │
│     │   │   │   │   bookshelfRepo.create(userId, name)   │ │ │ │ │
│     │   │   │   │   return ok(c, shelf)                  │ │ │ │ │
│     │   │   │   └───────────────────────────────────────┘ │ │ │ │
│     │   │   └─────────────────────────────────────────────┘ │ │ │
│     │   └───────────────────────────────────────────────────┘ │ │
│     │   console.log("POST /api/bookshelves -> 200 1ms")       │ │
│     └─────────────────────────────────────────────────────────┘ │
│   } catch (err) { /* 正常情况不进入 */ }                          │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
响应出去：{ "code": 0, "data": { "id": "xxx", "name": "想读" }, "message": "ok" }
```

### 异常情况

假设 handler 里数据库挂了：

```
handler 抛出 Error('SQLITE_BUSY')
      │
      ▼ 异常向外冒泡
requireAuth：没有 try/catch，继续向上
cors：没有 try/catch，继续向上
requestLogger：await next() 抛异常，但没有 try/catch，继续向上
errorHandler：try/catch 捕获！
      │
      ▼
console.error('[unhandled error]', err)
return httpError(c, 500, '服务器内部错误')
      │
      ▼（响应往回走）
requestLogger：const ms = Date.now() - start;
              console.log("POST /api/bookshelves -> 500 23ms")  ← 照样记录
errorHandler：已经 return 了，不再继续
```

---

## 8. 如何扩展自定义中间件

### 8.1 步骤

1. 在 `src/middleware/` 下新建文件（如 `rateLimit.ts`）
2. 实现中间件函数，返回 `(c, next) => { ... }`
3. 在 `src/app.ts` 的 `createApp()` 里注册

### 8.2 模板

```typescript
// src/middleware/myMiddleware.ts
import type { Context, Next } from 'hono';
import { httpError } from '../utils/response.js';

export function myMiddleware() {
  return async (c: Context, next: Next) => {
    // next() 之前：预处理 / 拦截
    const startTime = Date.now();

    await next();  // 透传（或根据条件不调 next() 直接返回）

    // next() 之后：后处理
    console.log(`耗时 ${Date.now() - startTime}ms`);
  };
}
```

### 8.3 注册

```typescript
// src/app.ts
import { myMiddleware } from './middleware/myMiddleware.js';

export function createApp() {
  const app = new Hono();
  app.use('*', errorHandler());
  app.use('*', requestLogger());
  app.use('*', myMiddleware());  // ← 加这行
  // ...
  return app;
}
```

---

## 9. 常见场景示例

### 9.1 请求限流

```typescript
// src/middleware/rateLimit.ts
import type { Context, Next } from 'hono';
import { httpError } from '../utils/response.js';

const counts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxPerMinute = 60) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('X-Real-IP') || c.req.header('host') || 'unknown';
    const now = Date.now();
    const record = counts.get(ip);

    if (!record || now > record.resetAt) {
      counts.set(ip, { count: 1, resetAt: now + 60_000 });
    } else {
      record.count++;
      if (record.count > maxPerMinute) {
        return httpError(c, 429, '请求过于频繁，请稍后再试');
      }
    }

    await next();
  };
}

// 使用
app.use('/api/auth/login', rateLimit(5));  // 登录接口更严格：5 次/分钟
app.use('/api/*', rateLimit(100));         // 通用：100 次/分钟
```

### 9.2 请求耗时告警

```typescript
// src/middleware/slowWarning.ts
export function slowWarning(thresholdMs = 1000) {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    if (ms > thresholdMs) {
      console.warn(`[慢请求] ${c.req.method} ${c.req.url} 耗时 ${ms}ms`);
    }
  };
}
```

### 9.3 维护模式

```typescript
// src/middleware/maintenance.ts
import { config } from '../config.js';

export function maintenanceMode() {
  return async (c: Context, next: Next) => {
    if (config.isMaintenance && !c.req.path.startsWith('/api/health')) {
      return c.json(
        { code: 503, data: null, message: '系统维护中，请稍后再试' },
        503
      );
    }
    await next();
  };
}
```

### 9.4 请求 ID 追踪

```typescript
// src/middleware/requestId.ts
import { randomUUID } from 'node:crypto';

export function requestId() {
  return async (c: Context, next: Next) => {
    const id = c.req.header('X-Request-ID') || randomUUID();
    c.res.headers.set('X-Request-ID', id);
    await next();
  };
}
```

### 9.5 仅内网访问

```typescript
// src/middleware/internalOnly.ts
export function internalOnly() {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('X-Real-IP') || '';
    if (!ip.startsWith('10.') && !ip.startsWith('192.168.') && ip !== '127.0.0.1') {
      return c.json({ code: 403, data: null, message: '无权访问' }, 403);
    }
    await next();
  };
}
```

---

## 10. 最佳实践

### 10.1 中间件顺序

```
errorHandler（最外层）
  → 日志
  → 限流
  → 维护模式
  → CORS
  → 鉴权（路由级）
  → 业务处理器（最内层）
```

**原则**：
- 错误处理包在最外 → 能捕获一切
- 限流在鉴权之前 → 未登录的恶意请求也要限
- 维护模式在鉴权之前 → 维护时连登录都不让

### 10.2 中间件应该无副作用（或可控）

```typescript
// ✅ 好：只在 next() 之后读 c.res，不写
await next();
console.log(c.res.status);  // 只读

// ❌ 坏：在 next() 之前写响应又调 next()
return c.json(...);  // 直接返回
await next();        // 永远不会执行
```

### 10.3 类型安全

给 `AuthState` 这样的接口加 `Variables`，下游自动推导类型：

```typescript
export interface AuthState {
  Variables: { user: JwtPayload };
}

// 路由声明时带类型
export const routes = new Hono<AuthState>();
```

### 10.4 不要把所有逻辑塞一个中间件

```typescript
// ❌ 坏：一个中间件干所有事
app.use('*', async (c, next) => {
  // 鉴权 + 日志 + 限流 + CORS + 错误处理...全堆一起
});

// ✅ 好：拆成多个小中间件，各司其职
app.use('*', errorHandler());
app.use('*', requestLogger());
app.use('*', cors());
app.use('/api/*', rateLimit());
```

### 10.5 性能意识

中间件每个请求都会执行，避免在里面做重操作：

```typescript
// ❌ 坏：每个请求查一次数据库
await next();
await db.query('SELECT count FROM stats');

// ✅ 好：用内存缓存 / 异步写入
await next();
redis.incr('request_count');
```

### 10.6 测试

中间件可以单独测试：

```typescript
import { Hono } from 'hono';
import { requireAuth } from './middleware/auth.ts';

const app = new Hono();
app.get('/test', requireAuth, c => c.json({ ok: true }));

// 没 token → 401
const res1 = await app.request('/test');
assert(res1.status === 401);

// 有 token → 200
const res2 = await app.request('/test', {
  headers: { Authorization: 'Bearer valid-token' },
});
assert(res2.status === 200);
```

---

## 附录：文件索引

| 文件 | 职责 |
|---|---|
| `src/middleware/error.ts` | 统一错误处理 |
| `src/middleware/logger.ts` | 请求日志 |
| `src/middleware/auth.ts` | JWT 鉴权、可选鉴权、管理员校验 |
| `src/utils/errors.ts` | AppError 自定义异常类 |
| `src/utils/jwt.ts` | JWT 签发与验证 |
| `src/utils/response.ts` | 统一响应格式工具（ok / fail / httpError） |
| `src/app.ts` | 中间件注册与路由装配 |
| `src/config.ts` | 配置读取（JWT secret 等） |
