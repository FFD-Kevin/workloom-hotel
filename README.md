# 小WorkLoom · 企业智能执行中枢

WorkLoom 织元 MVP —— 企业级 AI 业务编排与执行底座（Enterprise AI Execution Layer）。
需求唯一事实源：`docs/prd/PRD-V3.0.md`；落地计划：`docs/PLAN.md`；接力进度：`docs/PROGRESS.md`。

## 快速开始（macOS）

```bash
# 前置：Homebrew、Docker Desktop 或 OrbStack、nvm、git
nvm install 24 && nvm use 24
brew install pnpm            # 或 corepack enable && corepack prepare pnpm@latest --activate

git clone git@github.com:geniusdapeng-collab/workloom.git
cd workloom
pnpm install

bash scripts/doctor.sh       # 环境自检
bash scripts/dev.sh          # 起 PG17+Presidio → 迁移 → server(:8787) + web(:5173)
pnpm db:seed                 # 演示数据（杭州湖滨店 / 王店长 / 调价Agent v2.3 …）

open http://localhost:5173   # Workspace 骨架 + 连通自检
```

## 目录结构

```
apps/server   Hono + tRPC 11 后端（接口层 → modules → packages 领域包）
apps/web      React 19 + Vite 7 + Tailwind 4 前端 Workspace
packages/db   drizzle schema + 手写 SQL 迁移（9 表，append-only 事件库 + RLS）
packages/*    flydata-core / fence-engine / review-console / preset-loader（Phase 2）
scripts/      dev.sh / stop.sh / doctor.sh / migrate.ts / seed.ts
docs/         PLAN.md（总纲） PROGRESS.md（进度） DECISIONS.md（决策） prd/（PRD）
```

## 铁律

1. 一切动作写 `biz_events`（append-only + 哈希链），旁路直写被数据库拒绝（L6）。
2. 围栏三级判定 auto / review / block；基线规则只可收紧不可放宽（L4）。
3. 需求编号 FC/FE/FO/FR/FD/FX/L/E/K/PI 全程回引 PRD（commit、代码注释、任务卡）。
4. 令牌与密钥不入库：`.env` 已 gitignore；`credentials` 表只存 vault 引用。
