#!/usr/bin/env bash
# 小WorkLoom 一键开发启动（本挂载不支持 exec 位，请用 bash scripts/dev.sh 调用）
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { cp .env.example .env; echo "已生成 .env（请按需填写 DEEPSEEK_API_KEY）"; }

echo "[1/4] 启动依赖容器（PostgreSQL 17 + pgvector、Presidio）…"
docker compose up -d

echo "[2/4] 等待数据库就绪…"
until docker compose exec -T db pg_isready -U workloom -d workloom >/dev/null 2>&1; do sleep 1; done

echo "[3/4] 数据库迁移…"
pnpm db:migrate

echo "[4/4] 启动 server(:8787) + web(:5173)…"
pnpm dev
