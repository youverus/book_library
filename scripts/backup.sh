#!/usr/bin/env bash
# 数据库备份脚本（SQLite）
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)/backend"
DATA_DIR="$BACKEND_DIR/data"
BACKUP_DIR="$BACKEND_DIR/data/backups"
DB_FILE="$DATA_DIR/book_library.db"
DATE=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=${KEEP_DAYS:-30}

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_FILE" ]; then
  echo "[backup] 数据库文件不存在: $DB_FILE"
  exit 1
fi

# SQLite 热备份（_online_backup 安全）
sqlite3 "$DB_FILE" ".backup '$BACKUP_DIR/book_library_$DATE.db'"

# 压缩
gzip -f "$BACKUP_DIR/book_library_$DATE.db"

echo "[backup] 备份完成: $BACKUP_DIR/book_library_$DATE.db.gz"

# 清理过期备份
find "$BACKUP_DIR" -name "*.db.gz" -mtime +$KEEP_DAYS -delete 2>/dev/null || true
echo "[backup] 已清理 $KEEP_DAYS 天前的备份"
