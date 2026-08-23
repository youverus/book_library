# Book Library — API 文档

> 后端 API 完整接口说明。所有接口前缀为 `/api`，统一响应格式。

---

## 通用约定

### Base URL

- 开发：`http://localhost:8000/api`
- 生产：`https://youhxian.cn/api`

### 统一响应格式

```json
{
  "code": 0,
  "data": {},
  "message": "ok"
}
```

- `code`：0 表示成功，非 0 表示错误
- `data`：响应数据（对象或数组）
- `message`：错误时的提示信息

### 鉴权

需在请求头携带 JWT：

```
Authorization: Bearer <token>
```

### 错误码

| code | 含义 |
|---|---|
| 0 | 成功 |
| 400 | 参数错误 |
| 401 | 未登录或 token 失效 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 冲突（如用户名已存在） |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

---

## 健康检查

### GET /api/health

服务健康检查。

**响应**：
```json
{
  "code": 0,
  "data": { "status": "ok", "db": "connected", "uptime": 12345 },
  "message": "ok"
}
```

---

## 认证模块

### POST /api/auth/register

注册新用户。

**请求体**：
```json
{
  "username": "youverus",
  "email": "youveritas@163.com",
  "password": "your-strong-password"
}
```

**响应**：
```json
{
  "code": 0,
  "data": {
    "user": { "id": "uuid", "username": "youverus", "email": "..." },
    "token": "jwt-token"
  }
}
```

### POST /api/auth/login

登录。

**请求体**：
```json
{
  "account": "youverus",
  "password": "your-strong-password"
}
```

> `account` 可以是用户名或邮箱。

**响应**：
```json
{
  "code": 0,
  "data": {
    "user": { "id": "uuid", "username": "youverus", "email": "..." },
    "token": "jwt-token"
  }
}
```

### POST /api/auth/logout

登出（客户端丢弃 token，服务端可维护黑名单）。

### GET /api/auth/me

获取当前登录用户信息。

**响应**：
```json
{
  "code": 0,
  "data": { "id": "uuid", "username": "youverus", "email": "..." }
}
```

### POST /api/auth/refresh

刷新 token。

---

## 书籍模块

### GET /api/books

书籍列表（支持分页、分类、排序）。

**Query 参数**：

| 参数 | 类型 | 说明 |
|---|---|---|
| page | number | 页码，默认 1 |
| pageSize | number | 每页数量，默认 20 |
| category | string | 分类筛选 |
| sort | string | `newest` / `popular` / `title` |
| keyword | string | 搜索关键词 |

**响应**：
```json
{
  "code": 0,
  "data": {
    "items": [
      { "id": "uuid", "title": "...", "author": "...", "cover_url": "...", "category": "..." }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### GET /api/books/:id

书籍详情。

**响应**：
```json
{
  "code": 0,
  "data": {
    "id": "uuid",
    "title": "...",
    "author": "...",
    "cover_url": "...",
    "description": "...",
    "category": "...",
    "total_chapters": 120,
    "total_pages": 3600,
    "chapters": [{ "id": 1, "title": "第一章", "page_start": 1, "page_end": 30 }]
  }
}
```

### POST /api/books

新增书籍（需管理员权限）。

**请求体**：
```json
{
  "title": "...",
  "author": "...",
  "cover_url": "...",
  "description": "...",
  "category": "...",
  "total_chapters": 120,
  "total_pages": 3600
}
```

### PUT /api/books/:id

更新书籍（需管理员权限）。

### DELETE /api/books/:id

删除书籍（需管理员权限）。

---

## 书架模块

### GET /api/bookshelves

获取当前用户的书架列表。

**响应**：
```json
{
  "code": 0,
  "data": [
    { "id": "uuid", "name": "想读", "book_count": 12, "created_at": "..." }
  ]
}
```

### POST /api/bookshelves

创建书架。

**请求体**：
```json
{ "name": "想读" }
```

### PUT /api/bookshelves/:id

重命名书架。

### DELETE /api/bookshelves/:id

删除书架。

### POST /api/bookshelves/:id/books

添加书籍到书架。

**请求体**：
```json
{ "book_id": "uuid" }
```

### DELETE /api/bookshelves/:id/books/:bookId

从书架移除书籍。

### GET /api/bookshelves/:id/books

获取书架中的书籍列表。

---

## 阅读进度模块

### GET /api/progress/:bookId

获取某本书的阅读进度。

**响应**：
```json
{
  "code": 0,
  "data": {
    "book_id": "uuid",
    "chapter": 5,
    "page": 142,
    "percentage": 0.394,
    "last_position": "cfi=/6/142",
    "updated_at": "2026-08-23T10:00:00Z"
  }
}
```

### PUT /api/progress/:bookId

更新阅读进度（增量更新，只传变更字段）。

**请求体**：
```json
{
  "chapter": 6,
  "page": 160,
  "percentage": 0.444,
  "last_position": "cfi=/6/160"
}
```

> 服务端自动更新 `updated_at`，多端同步时以此时间戳为准。

### GET /api/progress

获取当前用户所有阅读进度（用于书架展示）。

**响应**：
```json
{
  "code": 0,
  "data": [
    { "book_id": "uuid", "percentage": 0.444, "updated_at": "..." }
  ]
}
```

---

## 笔记 / 书签模块

### GET /api/notes

获取笔记列表。

**Query 参数**：

| 参数 | 类型 | 说明 |
|---|---|---|
| bookId | string | 按书籍筛选 |
| type | string | `note` / `bookmark` |
| since | string | 增量同步时间戳（ISO 8601） |

**响应**：
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "uuid",
        "book_id": "uuid",
        "chapter": 6,
        "page": 160,
        "type": "note",
        "content": "这一段写得真好",
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "sync_time": "2026-08-23T10:00:00Z"
  }
}
```

> `since` 参数用于增量同步：只返回 `updated_at > since` 的记录。

### POST /api/notes

创建笔记/书签。

**请求体**：
```json
{
  "book_id": "uuid",
  "chapter": 6,
  "page": 160,
  "type": "note",
  "content": "这一段写得真好"
}
```

### PUT /api/notes/:id

更新笔记。

### DELETE /api/notes/:id

删除笔记。

---

## 搜索模块

### GET /api/search

全文搜索（书籍标题、作者、描述）。

**Query 参数**：

| 参数 | 类型 | 说明 |
|---|---|---|
| q | string | 搜索关键词 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

**响应**：
```json
{
  "code": 0,
  "data": {
    "items": [
      { "id": "uuid", "title": "...", "author": "...", "highlight": "...<em>关键词</em>..." }
    ],
    "total": 10
  }
}
```

> 实现：SQLite 用 `LIKE`，后续可升级为 FTS5 或 Meilisearch。

---

## 同步模块

### GET /api/sync

**多端增量同步入口**。

**Query 参数**：

| 参数 | 类型 | 说明 |
|---|---|---|
| since | string | 上次同步时间戳（ISO 8601） |

**响应**：
```json
{
  "code": 0,
  "data": {
    "progress": [ ... ],   // updated_at > since 的进度
    "notes": [ ... ],      // updated_at > since 的笔记
    "bookshelves": [ ... ],// updated_at > since 的书架变更
    "sync_time": "2026-08-23T10:00:00Z"
  }
}
```

客户端流程：
1. 本地存 `last_synced_at`
2. 调用 `GET /api/sync?since=<last_synced_at>`
3. 合并变更到本地
4. 更新 `last_synced_at` 为响应的 `sync_time`

---

## 限流策略

- 全局限流：100 次/分钟/IP
- 登录接口：5 次/分钟/IP（防暴力破解）
- 搜索接口：30 次/分钟/IP

超出限流返回：
```json
{ "code": 429, "data": null, "message": "请求过于频繁，请稍后再试" }
```
