#!/usr/bin/env bash
# 数据库迁移脚本（在容器内或本地执行）
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)/backend"
cd "$BACKEND_DIR"

echo "[migrate] 开始数据库迁移..."
if [ -f "package.json" ]; then
  npm run migrate
else
  echo "[migrate] 未找到 package.json"
  exit 1
fi
echo "[migrate] 迁移完成"
