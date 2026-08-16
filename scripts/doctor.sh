#!/usr/bin/env bash
# WorkLoom IM 底座 · 环境自检（macOS）
# 用法：bash scripts/doctor.sh
set -u

ok()   { printf "✅ %s\n" "$1"; }
warn() { printf "⚠️  %s\n" "$1"; }
bad()  { printf "❌ %s\n" "$1"; }

echo "== WorkLoom IM 底座 · doctor =="

# Node 24 LTS
if command -v node >/dev/null 2>&1; then
  NV=$(node -v | sed 's/v//')
  MAJOR=${NV%%.*}
  if [ "$MAJOR" -ge 24 ]; then ok "node v$NV（≥24 LTS）"; else warn "node v$NV 低于 24 LTS，请 nvm install 24"; fi
else
  bad "未安装 node（brew install nvm && nvm install 24）"
fi

# pnpm
if command -v pnpm >/dev/null 2>&1; then
  ok "pnpm $(pnpm -v)"
else
  warn "未安装 pnpm（brew install pnpm 或 corepack enable）"
fi

# Docker / OrbStack
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then ok "docker 守护进程运行中"; else warn "docker 已安装但守护进程未启动（打开 Docker Desktop / OrbStack）"; fi
else
  warn "未安装 docker（备选：brew install postgresql@17 + pgvector，见 README）"
fi

# git
command -v git >/dev/null 2>&1 && ok "git $(git --version | awk '{print $3}')" || bad "未安装 git"

# 端口占用
if command -v lsof >/dev/null 2>&1; then
  for P in 5432 8787 5173; do
    if lsof -iTCP:"$P" -sTCP:LISTEN >/dev/null 2>&1; then warn "端口 $P 已被占用"; else ok "端口 $P 空闲"; fi
  done
fi

echo "== 自检完成 =="
