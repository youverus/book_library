# Changelog

所有重要变更均记录于此，格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2026-08-23

### Added
- **用户系统**：注册 / 登录 / JWT 鉴权 / 刷新 token / 获取当前用户
- **书籍管理**：书籍列表（分页、分类、排序、关键词搜索）、书籍详情、管理员 CRUD
- **书架系统**：书架 CRUD、多对多书籍管理、书架书籍列表
- **阅读进度**：进度 upsert（按 user_id + book_id 唯一）、多端增量同步
- **笔记 / 书签**：CRUD、按书籍/类型筛选、增量同步
- **全文搜索**：标题、作者、描述 LIKE 搜索（可升级为 FTS5 / Meilisearch）
- **多端同步**：`GET /api/sync?since=` 统一增量同步入口（进度、笔记、书架）
- **前端**：Next.js 15 + Tailwind 响应式（首页、登录/注册、书籍详情、书架、搜索、我的、阅读器占位）
- **Nginx 反代**：开发版（HTTP）+ 生产版（HTTPS + 限流 + 安全头 + 静态缓存）
- **Docker Compose**：一键编排 Nginx + 前端 + 后端
- **安全**：bcrypt 哈希、JWT、HTTPS、HSTS、CSP、CORS 白名单、SQL 参数化、双层限流
- **部署文档**：阿里云 ECS + youhxian.cn + Let's Encrypt 完整指南
- **架构文档**：技术栈选型、数据模型、同步机制、2G 内存优化、扩展性设计
- **Git 规范**：Git Flow 轻量版 + Conventional Commits + SemVer
- **运维脚本**：数据库备份（带压缩与过期清理）、迁移脚本

### Security
- 密码 bcrypt 哈希（cost=10）
- JWT HS256 + 7 天过期
- HTTPS + HSTS + CSP
- 登录接口严格限流（5 次/分钟/IP）
- SQL 参数化查询（Drizzle ORM）
