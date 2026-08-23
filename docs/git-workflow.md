# Book Library — Git 版本管理规范

> 本项目采用 **Git Flow 轻量版** + **Conventional Commits**，保证版本历史清晰、可追溯、易发布。

---

## 1. 分支策略

```
main (生产分支，只接受 hotfix / release 合并)
│
├── develop (开发分支，日常合并)
│   ├── feature/auth
│   ├── feature/books
│   ├── feature/bookshelf
│   ├── feature/progress
│   ├── feature/search
│   └── feature/reader
│
├── release/v1.0.0 (发布分支)
└── hotfix/fix-login (紧急修复)
```

### 分支职责

- **main**：生产代码，每个 commit 对应一个可部署版本，打 tag。
- **develop**：开发集成分支，feature 分支合并到此。
- **feature/\***：功能分支，从 develop 开出，完成后合回 develop。
- **release/\***：发布分支，从 develop 开出，只修 bug，完成后合入 main + develop。
- **hotfix/\***：紧急修复，从 main 开出，完成后合入 main + develop。

### 分支命名规范

```
feature/<功能名>      例：feature/books-crud
bugfix/<问题描述>     例：bugfix/login-redirect
hotfix/<紧急修复>     例：hotfix/jwt-expiry
release/<版本号>      例：release/v1.0.0
```

---

## 2. Conventional Commits

提交信息格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### type 类型

| type | 说明 |
|---|---|
| feat | 新功能 |
| fix | 修复 bug |
| docs | 文档变更 |
| style | 代码格式（不影响逻辑） |
| refactor | 重构（不是新功能也不是修 bug） |
| perf | 性能优化 |
| test | 测试 |
| chore | 构建过程或辅助工具变动 |
| ci | CI 配置变更 |
| revert | 回退 |

### scope（可选）

模块名：`auth`、`books`、`bookshelf`、`progress`、`notes`、`search`、`api`、`ui`、`deploy`

### 示例

```
feat(books): 新增书籍 CRUD API 与迁移

- 添加 books 表 schema
- 实现 GET/POST/PUT /api/books
- 添加分页与分类筛选

Closes #12
```

```
fix(auth): 修复 JWT 过期后未返回 401 的问题

token 过期时应返回 { code: 401 } 而非 500。

Closes #23
```

```
docs(deploy): 补充 SQLite 迁移 PostgreSQL 步骤

Refs: #30
```

---

## 3. 版本号规范（SemVer）

```
v<major>.<minor>.<patch>

例：v1.0.0, v1.1.0, v1.1.1
```

- **major**：不兼容的 API 变更
- **minor**：向后兼容的功能新增
- **patch**：向后兼容的 bug 修复

打 tag：

```bash
git tag -a v1.0.0 -m "release: v1.0.0 首个 MVP 版本"
git push origin v1.0.0
```

---

## 4. Pull Request 规范

### 提 PR 前

- [ ] 本地测试通过（`pnpm test`）
- [ ] 代码已格式化（`pnpm lint`）
- [ ] 分支基于最新的 develop
- [ ] 提交历史已整理（必要时 squash）

### PR 标题

```
feat(books): 实现书籍列表与详情接口
```

### PR 模板

```markdown
## 变更说明
<!-- 这个 PR 做了什么 -->

## 变更类型
- [ ] 新功能
- [ ] Bug 修复
- [ ] 重构
- [ ] 文档
- [ ] 其他

## 测试
<!-- 如何验证这些变更 -->

## Checklist
- [ ] 自测通过
- [ ] lint 通过
- [ ] 更新了相关文档
- [ ] 数据库迁移（如有）
```

---

## 5. CHANGELOG 维护

每次发布在 `CHANGELOG.md` 追加：

```markdown
## [1.0.0] - 2026-08-23

### Added
- 用户注册/登录（JWT）
- 书籍列表/详情/CRUD
- 书架管理
- 阅读进度多端同步
- 笔记/书签
- 搜索
- Docker Compose + Nginx + HTTPS 部署
```

---

## 6. 日常工作流示例

### 开发新功能

```bash
# 1. 切到 develop 并拉最新
git checkout develop
git pull origin develop

# 2. 创建功能分支
git checkout -b feature/bookshelf

# 3. 开发 + 提交
git add .
git commit -m "feat(bookshelf): 实现书架 CRUD API"

# 4. 推送并开 PR
git push origin feature/bookshelf
# 在 GitHub/Gitee 开 PR → develop

# 5. PR 合并后删除分支
git branch -d feature/bookshelf
```

### 发布新版本

```bash
# 1. 从 develop 创建 release 分支
git checkout develop
git checkout -b release/v1.1.0

# 2. 修 bug、更新版本号、更新 CHANGELOG
git commit -m "chore(release): v1.1.0 准备发布"

# 3. 合入 main
git checkout main
git merge --no-ff release/v1.1.0
git tag -a v1.1.0 -m "release: v1.1.0"

# 4. 合回 develop
git checkout develop
git merge --no-ff release/v1.1.0

# 5. 推送
git push origin main --tags
git push origin develop

# 6. 删除 release 分支
git branch -d release/v1.1.0
```

### 紧急修复

```bash
git checkout main
git checkout -b hotfix/fix-jwt-expiry
# 修复
git commit -m "fix(auth): 修复 JWT 未校验过期时间"
git checkout main
git merge --no-ff hotfix/fix-jwt-expiry
git tag -a v1.0.1 -m "release: v1.0.1"
git push origin main --tags
git checkout develop
git merge --no-ff hotfix/fix-jwt-expiry
git branch -d hotfix/fix-jwt-expiry
```

---

## 7. 远程仓库建议

- 主仓库：GitHub 或 Gitee（国内访问快）
- 建议开启分支保护：
  - `main`：需 PR + review 才能合并
  - `develop`：需 CI 通过

---

## 8. 大文件与敏感数据

- 数据库文件（`*.sqlite`）必须 gitignore
- `.env` 文件必须 gitignore，只提交 `.env.example`
- 书籍封面等大资源建议走 OSS，不入库 Git
