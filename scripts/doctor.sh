#!/usr/bin/env bash
# 环境自检（准出门禁前置项）
ok(){  printf "✅ %s\n" "$1"; }
bad(){ printf "❌ %s\n" "$1"; FAIL=1; }
info(){ printf "ℹ️  %s\n" "$1"; }
FAIL=0

if command -v node >/dev/null && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 22 ]; then
  ok "node $(node -v)"
else
  bad "需要 Node ≥22（建议 24 LTS：nvm install 24）"
fi
command -v pnpm >/dev/null && ok "pnpm $(pnpm -v)" || bad "缺少 pnpm（brew install pnpm）"
docker info >/dev/null 2>&1 && ok "docker 运行中" || bad "Docker 未运行（Docker Desktop / OrbStack）"
docker compose version >/dev/null 2>&1 && ok "docker compose 可用" || bad "docker compose 不可用"
command -v git >/dev/null && ok "git 已安装" || bad "缺少 git"
[ -f .env ] && ok ".env 存在" || info ".env 未生成（dev.sh 会自动从 .env.example 复制）"
lsof -i :5432 >/dev/null 2>&1 && info "5432 已被占用（若是本项目容器则正常）"
exit $FAIL
