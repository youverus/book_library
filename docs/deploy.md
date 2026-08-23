# Book Library — 云上部署指南

> 本文档详细说明如何在阿里云 ECS（2G 内存）上部署 Book Library，绑定域名 **youhxian.cn**，配置 Let's Encrypt HTTPS，并通过 Docker Compose 一键编排所有服务。

---

## 前置条件

- 一台阿里云 ECS（推荐：2核 2G，Ubuntu 22.04）
- 域名 `youhxian.cn` 已备案（如需国内访问）
- 域名 DNS 已指向服务器公网 IP（A 记录 `@` → 服务器 IP）
- 安全组开放端口：`80`、`443`、`22`

---

## 第一步：服务器初始化

SSH 登录服务器后执行：

```bash
# 登录
ssh root@<服务器公网IP>

# 更新系统
apt update && apt upgrade -y

# 安装基础工具
apt install -y curl git ufw fail2ban

# 配置防火墙（只开放必要端口）
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 创建部署用户（非 root 运行服务）
adduser deploy --disabled-password --gecos ""
usermod -aG docker deploy
usermod -aG sudo deploy
```

---

## 第二步：安装 Docker 与 Docker Compose

```bash
# 安装 Docker 官方脚本
curl -fsSL https://get.docker.com | sh

# 启动并设置开机自启
systemctl enable docker
systemctl start docker

# 验证
docker --version
docker compose version
```

---

## 第三步：配置域名 DNS

在阿里云 DNS 控制台（或你的域名服务商）添加：

| 记录类型 | 主机记录 | 记录值 | TTL |
|---|---|---|---|
| A | `@` | `<服务器公网IP>` | 600 |
| A | `www` | `<服务器公网IP>` | 600 |

验证 DNS 生效：

```bash
dig youhxian.cn +short
# 应返回服务器公网 IP
```

---

## 第四步：克隆项目与配置环境

```bash
# 切换到部署用户
su - deploy

# 克隆项目
git clone <你的仓库URL> /home/deploy/book_library
cd book_library

# 复制环境变量模板
cp .env.example .env

# 编辑 .env，至少修改以下项：
nano .env
```

**.env 关键配置项**：

```dotenv
# JWT 密钥：用 `openssl rand -hex 32` 生成强随机值
JWT_SECRET=此处填写强随机字符串

# 数据库（2G 内存服务器推荐 sqlite）
DB_DRIVER=sqlite
SQLITE_PATH=/app/data/book_library.db

# 前端 API 地址
NEXT_PUBLIC_API_BASE=https://youhxian.cn/api

# Let's Encrypt 邮箱
ACME_EMAIL=youveritas@163.com
DOMAIN=youhxian.cn
```

生成强随机 JWT_SECRET：

```bash
openssl rand -hex 32
# 将输出填入 .env 的 JWT_SECRET
```

---

## 第五步：首次启动与证书签发

```bash
cd /home/deploy/book_library

# 1. 先启动 Nginx（HTTP 模式，用于 ACME 挑战）
docker compose up -d nginx

# 2. 申请 Let's Encrypt 证书
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email youveritas@163.com \
  --agree-tos \
  --no-eff-email \
  -d youhxian.cn \
  -d www.youhxian.cn

# 3. 证书签发成功后，重启 Nginx（自动切换到 HTTPS 配置）
docker compose restart nginx

# 4. 启动全部服务
docker compose up -d

# 5. 查看状态
docker compose ps
docker compose logs -f
```

---

## 第六步：数据库迁移与初始化

```bash
# 执行迁移（创建表）
docker compose exec backend pnpm migrate

# 执行种子数据（可选：创建管理员账号 + 示例书籍）
docker compose exec backend pnpm seed
```

种子数据会创建：
- 管理员账号：`admin` / `admin123`（**首次登录后请立即修改密码**）
- 示例书籍若干本

---

## 第七步：验证部署

```bash
# 健康检查
curl -s https://youhxian.cn/api/health | jq

# 应返回：
# { "code": 0, "data": { "status": "ok", "db": "connected" }, "message": "ok" }
```

浏览器打开：
- `https://youhxian.cn` → 前端首页
- `https://youhxian.cn/api/health` → 后端健康检查

---

## 日常运维

### 更新代码

```bash
cd /home/deploy/book_library
git pull origin main
docker compose build
docker compose up -d
```

### 查看日志

```bash
docker compose logs -f --tail=100
docker compose logs -f backend
docker compose logs -f frontend
```

### 数据库备份

```bash
# 手动备份
./scripts/backup.sh

# 或定时任务（每天 3:00 自动备份）
crontab -e
# 添加：
# 0 3 * * * /home/deploy/book_library/scripts/backup.sh >> /home/deploy/book_library/data/backup.log 2>&1
```

### 数据库迁移（更新后）

```bash
docker compose exec backend pnpm migrate
```

### 回滚

```bash
# 回退到上一个 git 版本
git log --oneline
git revert <commit-hash>
docker compose build
docker compose up -d
```

---

## 常见问题

### 1. 证书续期失败

Certbot 容器每 12h 自动续期。如失败：

```bash
docker compose logs certbot
docker compose run --rm certbot renew --force-renewal
docker compose restart nginx
```

### 2. 502 Bad Gateway

后端服务未启动或健康检查失败：

```bash
docker compose ps
docker compose logs backend
```

### 3. 内存不足

检查内存使用：

```bash
free -h
docker stats
```

优化：
- 确认使用 SQLite（`DB_DRIVER=sqlite`），不要开 PostgreSQL
- 限制 Next.js 内存：在 `docker-compose.yml` 前端服务加 `deploy.resources.limits.memory: 300M`

### 4. 端口被占用

```bash
# 查看 80/443 占用
ss -tlnp | grep -E ':(80|443)'
```

---

## 安全建议

1. **立即修改默认管理员密码**
2. **SSH 禁用密码登录**：改用密钥
3. **定期更新**：`apt update && apt upgrade`
4. **数据库备份上传 OSS**：避免单点故障
5. **启用 Nginx 限流**：防刷 API
6. **不暴露 8000/3000 端口**：仅 Nginx 对外

---

## 从 SQLite 迁移到 PostgreSQL（可选）

当数据量或并发增长时：

```bash
# 1. 在 docker-compose.yml 添加 postgres 服务
# 2. 导出 SQLite 数据
sqlite3 data/book_library.db .dump > dump.sql
# 3. 转换 SQL 语法并导入 Postgres
# 4. 修改 .env：DB_DRIVER=postgres
# 5. docker compose up -d
```

详细迁移脚本见 `scripts/migrate-sqlite-to-postgres.sh`（后续按需补充）。
