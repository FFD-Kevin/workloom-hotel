# 开发进度（接力唯一事实源）

> **新窗口接力方法**：对 Kimi 说「我们继续迭代小WorkLoom」，Kimi 会读取本文件与 `DECISIONS.md`，同步进展后继续开发。
> 维护纪律：每完成一个任务卡即更新本文件并推送；「最后游标」精确到文件级。

## 阶段总览

| 阶段 | 状态 | tag |
|---|---|---|
| Phase 1 环境初始化 | ✅ 代码完成（待 Mac 实测回填门禁） | `phase-1-done` |
| Phase 2 后端 API | ⬜ 下一阶段 | — |
| Phase 3 前端页面 | ⬜ 未开始 | — |
| Phase 4 联调与启动 | ⬜ 未开始 | — |

## Phase 1 任务卡

- [x] T1.1 GitHub 建仓（私有）+ PROGRESS / DECISIONS 接力机制
- [x] T1.2 monorepo 骨架（pnpm workspace + TS 基座 + 根脚本）
- [x] T1.3 docker-compose（PG17+pgvector、Presidio sidecar）
- [x] T1.4 九表 DDL + biz_events 禁改触发器 + RLS + seed（`packages/db/migrations/0001_init.sql`、`scripts/seed.ts`）
- [x] T1.5 server 骨架（Hono + tRPC ping/meta/dbHealth）+ web 骨架（Vite + 连通自检页）+ `scripts/dev.sh`

## 最后游标

- **下一步**：Phase 2 → **T2.1 flydata-core**（五元事件 zod Schema + 写入瀑布〔权限→Presidio 脱敏→高风险授权〕+ 哈希链 + event_id 幂等；对齐 FE1/FE3/FD3/L6）。首个文件：`packages/flydata-core/src/schema.ts`。
- **待回填（Mac 实测门禁）**：`bash scripts/doctor.sh` 与 `bash scripts/dev.sh` 执行结果；`pnpm install` 成功后提交 `pnpm-lock.yaml`；打开 http://localhost:5173 确认三项自检全绿；`psql` 验证 `UPDATE biz_events` 被拒绝。

## 运行方式

见 `README.md` 快速开始。简版：`pnpm install` → `bash scripts/dev.sh` → `pnpm db:seed`。

## 已知限制与说明

- 依赖解析未在交付侧执行（沙箱挂载不支持符号链接），以 Mac 首次 `pnpm install` 为准。
- dsh（Agent 运行时）Phase 2 才以 vendor fork 引入 `vendor/dsh`（锁 v0.1 commit）。
- RLS：表 owner（迁移/种子账号）默认绕过策略，应用连接需 `SET app.workspace_id`；Phase 2 在 tRPC 上下文中间件统一实现。
