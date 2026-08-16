# 开发进度（接力唯一事实源）· WorkLoom IM 底座

> **接力方法（任何工具通用）**：先读本文件 + `DECISIONS.md` + `MASTERPLAN.md` + `RELAY.md`；需求与视觉原件在 `docs/prd/`。
> 维护纪律：每完成一个任务卡/批次即更新本文件并推送；「最后游标」精确到文件级。
> Kimi 窗口触发词：「继续迭代WorkLoom IM」「开发WorkLoom 大底座」等 → 自动同步本文件并给出下一步。

## 阶段总览

| 阶段 | 状态 | tag |
|---|---|---|
| 阶段一 环境初始化 | 🚧 批次 1 已推送（待 Mac 实测回填门禁） | —（批次 2 后打 `v0.1.0`） |
| 阶段二 后端 API | ⬜ 未开始 | — |
| 阶段三 前端页面 | ⬜ 未开始 | — |
| 阶段四 联调与启动脚本 | ⬜ 未开始 | — |

## 阶段一任务卡

- [x] A1 monorepo 骨架（pnpm workspace + TS 基座 + 根脚本）— commit `2aa6c72`
- [x] A2 五元事件 zod Schema（附录 E 逐字段）+ 枚举 + 常量 + ID 工具 + 4 条 vitest — commit `2aa6c72`
- [x] A3 18 表 DDL（手写 `packages/db/migrations/0001_init.sql`）+ append-only 触发器 + RLS + 双角色 + Drizzle 类型镜像 — commit `2aa6c72`
- [x] A4 bundles/hotel：7 preset + 基线围栏 R1–R6 + 对象/阶段枚举 + 一店一档 Schema + 3 官方技能 — commit `2aa6c72`
- [ ] A5 seed 演示数据（demo 租户/云栖酒店/3 成员/7 Agent/档案/100 条五元事件）
- [ ] A6 apps/server 最小入口（Hono+tRPC）+ apps/web 壳（tokens.css+舰桥框架+空 P1）
- [ ] A7 start.sh / stop.sh + README 快速开始复核 + tag `v0.1.0`

## 最后游标

- **下一步**：阶段一批次 2（A5–A7）。首个文件：`scripts/seed.ts`。
- **待回填（Mac 实测门禁）**：`bash scripts/doctor.sh`；`docker compose up -d`；`pnpm install` 零报错；`pnpm db:migrate` 输出；`pnpm -C packages/shared test` 4 绿；`UPDATE biz_events` 被触发器拒绝（append-only 实测）。

## 运行方式

见 `README.md` 快速开始。

## 已知限制与说明

- 依赖解析以 Mac 首次 `pnpm install` 为准（交付侧沙箱未跑安装）。
- 数据库迁移采用手写 SQL（`migrations/*.sql`）为 DDL 事实源，`packages/db/src/schema.ts` 为类型镜像，两者必须同步演进（DECISIONS D9）。
- RLS：表 owner（迁移/种子账号）默认绕过策略；应用连接须事务内 `set_config('app.workspace_id' / 'app.tenant_id')`（已由 `packages/db/src/client.ts` 的 `withWorkspace` 封装）。
- LLM 默认 `mock` provider（无 Key 全流程可跑）；真实模型在 `.env` 配 `LLM_PROVIDER/LLM_API_KEY`（阶段二 B7 落地）。
