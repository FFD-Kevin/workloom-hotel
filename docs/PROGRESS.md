# 开发进度（接力唯一事实源）· WorkLoom IM 底座

> **接力方法（任何工具通用）**：先读本文件 + `DECISIONS.md` + `MASTERPLAN.md` + `RELAY.md`；需求与视觉原件在 `docs/prd/`。
> 维护纪律：每完成一个任务卡/批次即更新本文件并推送；「最后游标」精确到文件级。
> Kimi 窗口触发词：「继续迭代WorkLoom IM」「开发WorkLoom 大底座」等 → 自动同步本文件并给出下一步。

## 阶段总览

| 阶段 | 状态 | tag |
|---|---|---|
| 阶段一 环境初始化 | ✅ 完成（A1–A7，Linux 沙箱实测全绿；Mac 实测项见「待回填」） | `v0.1.0` |
| 阶段二 后端 API | 🚧 B0 已完成（dsh 落地验证三项实证全过）；下一卡 B1 | —（B10 后打 `v0.2.0`） |
| 阶段三 前端页面 | ⬜ 未开始 | — |
| 阶段四 联调与启动脚本 | ⬜ 未开始 | — |

## 阶段一任务卡

- [x] A1 monorepo 骨架（pnpm workspace + TS 基座 + 根脚本）— commit `2aa6c72`
- [x] A2 五元事件 zod Schema（附录 E 逐字段）+ 枚举 + 常量 + ID 工具 + 4 条 vitest — commit `2aa6c72`
- [x] A3 18 表 DDL（手写 `packages/db/migrations/0001_init.sql`）+ append-only 触发器 + RLS + 双角色 + Drizzle 类型镜像 — commit `2aa6c72`
- [x] A4 bundles/hotel：7 preset + 基线围栏 R1–R6 + 对象/阶段枚举 + 一店一档 Schema + 3 官方技能 — commit `2aa6c72`
- [x] A5 seed 演示数据（demo 租户/云栖酒店/3 成员/7 Agent/档案/围栏 R1–R6 装载/技能安装/触发器 ×2/演示线程 ×3/夜班班次/审批样例/组织记忆/100 条五元事件+哈希链）— `scripts/seed.ts`
- [x] A6 apps/server 最小入口（Hono+tRPC v11 fetch adapter+健康检查）+ apps/web 壳（tokens.css+舰桥框架+空 P1+链路自检卡）— `apps/server` / `apps/web`
- [x] A7 start.sh / stop.sh / reset.sh + README 快速开始复核 + tag `v0.1.0`

## 阶段二任务卡

- [x] B0 dsh 落地验证（D12）：vendor fork 锁 rc.6（integrity 核验，`vendor/dsh/VENDOR.md`）→ `pnpm dsh web` 跑通 200 → hello-fence 最小插件经 profile `cordis.patch.yml` 挂载成功（`tools/pre-execute` 瀑布）→《dsh 对接报告》+ 六插件 × seam 映射表（`docs/dsh-integration.md`）
- [x] B1 flydata-core 写入段：安全网关三段瀑布（权限/脱敏/高风险授权，F2.10/L9.1/L3.5 复查位）+ 事件 append + 哈希链 + 幂等（F1.1/F1.2/L1.4）— `packages/base/flydata-core/`，13 测试全绿（含 PG 集成：幂等丢弃/链序/脱敏落库）
- [x] B2 事件检索：结构化过滤（参数化白名单+防注入双保险）+ NL 入口薄自译（Mock/OpenAI 兼容双翻译器）+ 超时降级（E1.6，3s）— `packages/base/flydata-core/recall.ts`，27 测试全绿（含 PG 集成：计数/规则过滤/NL 端到端/越权返回空 L7.1）
- [x] B3 组织记忆：三级作用域 + 归因 + pgvector 检索 + 使用记录（F1.4/F6.1）— `packages/base/flydata-core/memory.ts`，34 测试全绿（含集成：写入脱敏/结构化+语义检索/归因反查/生命周期幂等）
- [x] B4 fence-engine：手写沙箱表达式求值器（L2.5 禁 eval）+ 纯函数判定器（deny 优先并集 E2.2/异常按 block E2.1/无命中走 default_level）+ 单调守卫（H-3 放宽基线被拒留痕）+ dry-run 回放 10 条（F2.5/L2.4 未确认禁激活）+ 对象写锁（pg advisory，超时转需介入 E2.5）+ 子调用同瀑布（H-4）— `packages/base/fence-engine/`，49 测试全绿
- [x] B5 tenancy + 鉴权：版本能力矩阵（F7.2 原文口径）+ 演示身份 JWT（jose）+ 中间件栈（401/403+升级提示）+ members/threads router + dispatch 建档留痕 — 实测：登录签发→me 能力下发→dispatch T-104；H-10 社区版 403 ✅；H-9 跨工作区返回空 ✅；59 测试全绿
- [x] B6 review-console：统一队列（F5.1 含 diff/规则版本投影）+ 三手势回写（权重 1/2/3，驳回空理由被拒 L5.2，编辑必带新值）+ 幂等（重复回调只处理首次 L5.3）+ 快照过期（E5.3）+ 超时升级扫描（高危不自动放行 L5.4）+ 批量采纳（高危跳过）+ readonly 403（L5.1）+ 驳回原因枚举回流偏好记忆（F1.7）+ approvals tRPC router — `packages/base/review-console/`，73 测试全绿（可重跑）
- [x] B7 model-router：记忆优先复用（F6.1 零消耗留痕）+ 确定性分级（F6.2 规则表）+ 峰谷窗口（F6.3，G9 谷时旗舰 ≤20% 实测）+ 降级链逐次留痕（F6.4/L6.1 禁静默）+ 逐事件计量+账单=事件投影（F6.5/L6.3）+ 单任务熔断（L6.4）+ 出站脱敏强制（F6.6/L6.2）+ 全链不可用排队/转需介入（E6.1）— `packages/base/model-router/`，84 测试全绿（含 PG 集成：计量/降级事件落库可检索）
- [ ] B8 runtime + 三态派遣：意图路由 + preset 装配 + loop + 回执校验 + replay 断点续跑（F3.1–F3.9/E3.3）
- [ ] B9 night-shift：候选清单 + 状态机 + 一键暂停 + 决策包三段投影 + 触发器引擎（F4.1–F4.8）
- [ ] B10 巡检 + 技能/意识：定时只读巡检 + 异常分级推送 + 一键派单 + 技能安装/绑定 + 高频检测建议（M9/F8.1–F8.4）

## 最后游标

- **下一步**：**B8 runtime + 三态派遣**（dsh 挂载首卡）：意图路由（含糊反问）+ preset 装配三要素校验 + agent loop + 回执校验 + replay 断点续跑（F3.1–F3.9/E3.3；验收 H-5 kill -9 重放续跑且幂等 / E3.7 无回执标未核实）。首个文件：`packages/runtime/plugins/flydata-core.ts`（dsh 插件挂载点，Cordis 生命周期）。
- **此后顺序**：B3 记忆 → B4 围栏 → B5 鉴权/tenancy → B6 审批 → B7 model-router → B8 runtime 三态派遣（dsh 挂载）→ B9 夜班 → B10 巡检/技能。

## 实测记录（2026-08-16 · Linux 沙箱，Node 24.19 / pnpm 10.14 / PG 17.11 + pgvector 0.8.6）

| 门禁 | 结果 |
|---|---|
| `pnpm install` 零报错 | ✅（注：无软链文件系统不支持 pnpm，需常规磁盘目录） |
| `pnpm db:migrate` | ✅ 双角色创建 + 0001_init.sql 应用成功 |
| `pnpm -C packages/shared test` | ✅ 4 绿（修复了 zod4 `z.iso.datetime()` 不认 `+08:00` 偏移的批次 1 遗留 bug，见下） |
| `pnpm db:seed` | ✅ 100 事件写入、H-1 验收完整率 100%；复跑幂等丢弃 100 条（L1.4） |
| append-only 实测 | ✅ gateway 角色 UPDATE/DELETE biz_events 被拒（触发器+权限双保险） |
| 旁路直写防控（F1.2） | ✅ workloom_app INSERT biz_events → permission denied |
| RLS 越权返回空（L7.1） | ✅ 未设/越权 workspace 上下文查询均返回 0 行 |
| tRPC 握手 | ✅ `GET /trpc/system.health` 200（db:up）；vite 代理链路同步验证 |
| web 构建与走查 | ✅ `vite build` 通过；无头浏览器截图确认星盟战舰基底+舰桥框架可见 |

**批次 1 遗留修复（本批次顺手回填）**：
1. `event-schema.ts`：三处 `z.iso.datetime()` 改 `z.iso.datetime({ offset: true })`（附录 E 示例带 `+08:00`，原写法单测「接受合法事件」失败）。
2. `0001_init.sql`：GRANT 序列名 `biz_events_seq` → `biz_events_seq_seq`（bigserial 列名为 seq 的实际序列名）。
3. 根 `package.json`：补 `pg`/`yaml`/`@workloom/shared` 依赖声明（migrate.ts/seed.ts 实际引用）；`@vitejs/plugin-react` pin `5.2.0`（6.x 依赖 vite 8 内部路径，与总纲 pin 的 vite 7 不兼容）。

## 待回填（Mac 实测门禁）

沙箱已覆盖上表全部机制项；以下 Mac 特有项待真机复核：`bash scripts/doctor.sh` 输出、`docker compose up -d`（OrbStack/Docker Desktop）、`./scripts/start.sh` 一条命令端到端（沙箱无 docker，docker 分支未实跑）。

## 运行方式

见 `README.md` 快速开始（`./scripts/start.sh` 一键）。

## 已知限制与说明

- 数据库迁移采用手写 SQL（`migrations/*.sql`）为 DDL 事实源，`packages/db/src/schema.ts` 为类型镜像，两者必须同步演进（DECISIONS D9）。
- RLS：表 owner（迁移/种子账号）默认绕过策略；应用连接须事务内 `set_config('app.workspace_id' / 'app.tenant_id')`（已由 `packages/db/src/client.ts` 的 `withWorkspace` 封装；seed 的 gateway 写入用会话级 set_config）。
- LLM 默认 `mock` provider（无 Key 全流程可跑）；真实模型在 `.env` 配 `LLM_PROVIDER/LLM_API_KEY`（阶段二 B7 落地）。
- 事件库 append-only：reset=整库重建（`scripts/reset.sh`），不做清表 DELETE。
init.sql`：GRANT 序列名 `biz_events_seq` → `biz_events_seq_seq`（bigserial 列名为 seq 的实际序列名）。
3. 根 `package.json`：补 `pg`/`yaml`/`@workloom/shared` 依赖声明（migrate.ts/seed.ts 实际引用）；`@vitejs/plugin-react` pin `5.2.0`（6.x 依赖 vite 8 内部路径，与总纲 pin 的 vite 7 不兼容）。

## 待回填（Mac 实测门禁）

沙箱已覆盖上表全部机制项；以下 Mac 特有项待真机复核：`bash scripts/doctor.sh` 输出、`docker compose up -d`（OrbStack/Docker Desktop）、`./scripts/start.sh` 一条命令端到端（沙箱无 docker，docker 分支未实跑）。

## 运行方式

见 `README.md` 快速开始（`./scripts/start.sh` 一键）。

## 已知限制与说明

- 数据库迁移采用手写 SQL（`migrations/*.sql`）为 DDL 事实源，`packages/db/src/schema.ts` 为类型镜像，两者必须同步演进（DECISIONS D9）。
- RLS：表 owner（迁移/种子账号）默认绕过策略；应用连接须事务内 `set_config('app.workspace_id' / 'app.tenant_id')`（已由 `packages/db/src/client.ts` 的 `withWorkspace` 封装；seed 的 gateway 写入用会话级 set_config）。
- LLM 默认 `mock` provider（无 Key 全流程可跑）；真实模型在 `.env` 配 `LLM_PROVIDER/LLM_API_KEY`（阶段二 B7 落地）。
- 事件库 append-only：reset=整库重建（`scripts/reset.sh`），不做清表 DELETE。
