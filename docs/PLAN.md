# 小WorkLoom · 项目落地总纲

> 项目：WorkLoom 织元 · 企业智能执行中枢（Enterprise AI Execution Layer）
> 仓库：github.com/geniusdapeng-collab/workloom（私有）
> 开发方式：全程 Kimi 对话框产出源码，macOS 本地编译运行
> 版本：V1.0（开工版） · 2026-08-16

---

## 0. 接力开发保障体系（三层机制）

| 层 | 机制 | 状态 |
|---|---|---|
| ① 跨会话记忆 | 项目锚点（项目名/技术栈/编号体系/接力协议）已写入 Kimi 长期记忆 | ✅ |
| ② 仓库内事实源 | `docs/PROGRESS.md`（任务卡状态 + 最后游标）+ `docs/DECISIONS.md`（决策记录），每完成一个文件即更新推送。**接力唯一事实源** | Phase 1 建立 |
| ③ 结构化交付 | 每任务卡产出完整文件树 + 逐文件完整源码，标注存放路径 | 全程执行 |

**接力口令**：用户说「我们继续迭代小WorkLoom」/「我们开发一下小WorkLoom」等类似表达时，Kimi 自动读取 `docs/PROGRESS.md`，同步当前进展并给出接下来的开发内容。

**GitHub 规范**：
- 仓库 `workloom`，私有，描述「小WorkLoom · 企业智能执行中枢」
- 令牌纪律：fine-grained PAT 仅授 repo 权限；令牌不写入任何文件与提交（`.gitignore` + 环境变量隔离）；每次推送完成后建议吊销轮换
- 提交规范：每任务卡一个 commit，格式 `[T2.1][FE1] 简述`（回引 PRD 编号）；每阶段打 tag（`phase-1-done` …）+ Release 说明

## 1. 技术栈选型（macOS arm64 原生可跑）

| 层 | 选型 | 版本 | 说明 |
|---|---|---|---|
| 运行时 | Node.js 24 LTS（nvm）+ pnpm 10 | — | Node 26 仍为 Current，不用 |
| 后端 | Hono + tRPC 11 + zod | Hono 4.13.x | tRPC 前后端同版本（11 与 10 线协议不兼容） |
| ORM/迁移 | drizzle-orm + 手写 SQL 迁移器（tsx + pg） | drizzle 0.45.x | schema 即类型源，迁移 SQL 入库 |
| 数据库 | PostgreSQL 17 + pgvector 0.8.x | Docker `pgvector/pgvector:pg17` | RLS + advisory lock + append-only 触发器 |
| Agent 运行时 | dsh（DeepSeek Harness）v0.1 pin + vendor fork | MIT | 官方明示预览期有破坏性变更，锁 commit 入 `vendor/dsh`，Phase 2 引入 |
| 浏览器自动化 | Stagehand（Node 版）+ Playwright Chromium | v3.x | Phase 4 才接；browser-use 进停车场 |
| 脱敏 | Microsoft Presidio | Docker sidecar | 避免 Mac 本地 Python 依赖，HTTP 调用 |
| 前端 | React 19 + Vite 7 + Tailwind 4 + shadcn/ui + TanStack Query | 最新稳定 | 视觉唯一事实源 = PRD V3.0 §9 高保真稿 |
| LLM | DeepSeek API（OpenAI 兼容） | deepseek-v4 系列 | Phase 2 起用，需 API Key |
| IM | 飞书 lark-oapi-sdk / 钉钉 stream SDK | — | Phase 4 真接，前期 mock |
| 测试 | Vitest + e2e 脚本 | — | 验收门槛用可执行断言表达 |

Mac 依赖：Homebrew、Docker Desktop 或 OrbStack、nvm、git（`scripts/doctor.sh` 一键检查）。

## 2. 系统架构设计

```
workloom/
├── docker-compose.yml          # PG17+pgvector、Presidio
├── docs/  PROGRESS.md  DECISIONS.md  prd/   # 接力事实源 + PRD入库
├── apps/
│   ├── server/src/
│   │   ├── index.ts            # Hono 入口（tRPC 挂载 + IM回调原生路由）
│   │   ├── trpc/               # router 聚合（接口层）
│   │   ├── modules/            # 应用服务层：tasks/events/fence/approvals/profiles/im
│   │   └── infra/              # db、dsh-bridge、presidio-client、幂等
│   └── web/src/
│       ├── pages/              # PI1~PI5 五页面
│       ├── components/         # 命名约定 P{页}E{角标}
│       └── lib/                # tRPC client、SSE/轮询 hook
├── packages/                   # 自研护城河四件 + 薄层
│   ├── flydata-core/           # 五元事件 Schema + 写入瀑布 + 哈希链（FE1/FE3）
│   ├── fence-engine/           # 三级判定 + 规则版本化 + dry-run（FO3）
│   ├── review-console/         # 审批域逻辑（FO4）
│   ├── preset-loader/          # 数字员工 preset 加载校验（FR1/L5）
│   ├── adapters/               # 平台适配器薄层（mock/feishu/dingtalk/browser）
│   └── db/                     # drizzle schema + migrations
├── vendor/dsh/                 # dsh v0.1 fork（Phase 2 引入）
└── scripts/  dev.sh start.sh stop.sh doctor.sh migrate.ts seed.ts
```

**后端分层**：接口层（tRPC）→ 应用服务 → 领域包（四件）→ 基础设施。
**核心写路径铁律**：一切动作 → 三段瀑布（权限校验 → Presidio 脱敏 → 高风险授权）→ 围栏判定（auto/review/block）→ 执行 → 回执核验 → biz_events append-only 落库（哈希链）；review 级挂起 → 审批（Web/IM 双通道）→ 决定回写线程继续执行。
**前后端交互**：tRPC query/mutation 为主；任务进度 SSE 推送（断线降级 5s 轮询）；IM 回调走 Hono 原生 POST（签名校验 + openid 映射 + 幂等）。

## 3. 数据库设计（9 表，全部 workspace 隔离 + RLS）

| 表 | 关键字段与约束 |
|---|---|
| `workspaces` | slug 唯一 |
| `members` | member_no（MEM-041）；role（admin/operator）；im_openids（jsonb） |
| `profiles` | profile_type（agent/human/workspace）；preset（工具集+提示词段+围栏声明+档案上下文）；fence_bindings；status（active/inactive/invalid + invalid_reason） |
| `tasks` | task_no（T-102）；status 五态；progress_done/total；assignee_profile_id |
| `biz_events` | event_id 唯一（幂等）；五元组 who/context/object/decision/rule_impact；receipt（NULL=未核实）；model_trace；prev_hash+hash 链；**触发器禁 UPDATE/DELETE**（L6） |
| `fence_rules` | (rule_key, version) 唯一；level 三级；source（baseline 锁定只可收紧，L4）；dry_run_report；draft→active→retired |
| `approvals` | approval_id 唯一；snapshot（before/after/expires_at，E10）；status 五态；驳回原因必填 |
| `credentials` | 不存明文，仅 vault_ref + scopes + 健康探针状态（FC5/FC6） |
| `im_callbacks` | (channel, event_id, direction) 幂等（E9） |

关系：workspace 1─n 各表；tasks 1─n biz_events；approvals 1─1 biz_events；profiles 1─n biz_events（who 归因，工时统计按此聚合）。

## 4. 分阶段任务清单（依赖拓扑）

### Phase 1 · 环境初始化
T1.1 建仓+初始化+PROGRESS/DECISIONS 机制 → T1.2 monorepo 骨架 → T1.3 docker-compose（PG+Presidio）→ T1.4 九表 DDL + 触发器 + RLS + seed → T1.5 server/web 双骨架 + dev.sh 一键起。
**准出门禁**：一条命令起全栈；禁改触发器实测生效；进度文件已推送。

### Phase 2 · 后端 API
T2.1 flydata-core（FE1/FE3/FD3/L6）→ T2.2 fence-engine（FO3/L4/E8）→ T2.3 任务线程 + dsh-bridge（FO1/FO2）→ T2.4 review-console（FO4/E10）→ T2.5 preset-loader + profiles/members API（FR1/FD2/L5）→ T2.6 mock 适配器 + 凭据管理 + IM mock（FC1/FC5）。
**准出门禁**：e2e 跑通「派遣→review 挂起→审批通过→执行→回执核验→事件可检索」。

### Phase 3 · 前端页面（PI-1~PI-5，组件级对齐 PRD §9）
T3.1 设计令牌+壳布局 → T3.2~T3.6 五页面逐个交付。
**准出门禁**：五页面连真实后端；空/错/权限/超时四态可复现。

### Phase 4 · 联调与启动
T4.1 飞书/钉钉真接 → T4.2 Stagehand 演示系统 → T4.3 start.sh/doctor.sh → T4.4 K1–K9 验收 + 真机连跑 3 个业务周期。
**准出门禁**：MVP 验收演练全过，打 `v0.1.0-mvp` tag。

## 5. 需求编号对齐

全程回引 PRD V3.0 编号：功能 FC/FE/FO/FR/FD/FX，硬约束 L1–L12，异常 E1–E14，验收口径 K1–K9，页面 PI-1~PI-5。任务卡、commit、代码注释三处编号一致。
