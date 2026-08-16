# 关键决策记录

| # | 决策 | 理由 / 影响 |
|---|---|---|
| D1 | 技术栈与版本见 `PLAN.md` §1：Node 24 LTS / Hono 4.13 / tRPC 11 / drizzle 0.45 / PG17+pgvector / React 19+Vite 7+Tailwind 4 | 全部 macOS arm64 原生可跑；tRPC 前后端同大版本（11 与 10 线协议不兼容） |
| D2 | dsh（DeepSeek Harness）v0.1 以 vendor fork 引入 `vendor/dsh`（Phase 2） | 官方明示预览期有破坏性变更；锁 commit，不追上游 |
| D3 | Presidio 以 Docker sidecar 运行（`docker-compose.yml`，:5002） | 避免 Mac 本地 Python 依赖；HTTP 调用 |
| D4 | IM（飞书/钉钉）先 mock 后真接 | mock 适配器 Phase 2 交付；真接 Phase 4，需用户提供自建应用凭证 |
| D5 | 迁移采用手写 SQL + tsx 执行器（`scripts/migrate.ts`），drizzle schema 仅作类型源 | drizzle-kit 对 RLS/触发器表达弱；手写 SQL 可控、入库可审计 |
| D6 | RLS 策略 + `app.workspace_id` 连接级设置；表 owner 默认绕过（迁移/种子用） | MVP 单实例够用；FORCE RLS 进停车场 |
| D7 | 仓库私有；令牌/密钥不入库（`.env` gitignore，credentials 表只存 vault 引用） | 安全纪律 |
| D8 | 脚本一律 `bash scripts/xxx.sh` 调用，不依赖 exec 位 | 交付侧挂载不保留可执行位 |
| D9 | tRPC 用官方 fetch adapter 直挂 Hono，不引 `@hono/trpc-server` | 少一个依赖面；行为完全可控 |
| D10 | zod 锁 3.24（暂不升 4） | tRPC 11 生态默认面最稳；升级触发条件：fence-engine DSL 需要 zod4 特性时 |
