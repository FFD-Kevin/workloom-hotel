# WorkLoom IM 底座 · 项目落地总纲 V1.0

> WorkLoom 织元 · 企业 Agent IM —— 全程 Kimi 对话框接力开发的落地执行总纲
> 事实源：PRD V2.5（需求）· 通用底座技术方案 V3（架构）· 星盟战舰设计规范 V1.0 + 高保真原型 V4.0（视觉）· 游戏规则手册 V1.0（叙事层）
> 本文不含任何排期与工期，四阶段仅表达依赖先后顺序与验收门槛。

---

## 0. 总览与关键决策

### 0.1 交付目标

在 macOS 上一键运行的全栈产品：**WorkLoom 通用底座（六大自有插件）+ 酒店版演示 Bundle + 前端 WorkSpace（P1–P9 全部页面与状态变体）**，代码完整托管于 GitHub 私有仓库 `workloom-im`（中文名「WorkLoom IM 底座」；与「小WorkLoom」项目的 `workloom` 仓库相互独立、计划各自推进）。

### 0.2 关键决策表（先于一切细节）

| 编号 | 决策 | 理由 |
| --- | --- | --- |
| D1 | ~~运行时不直接依赖 dsh，薄自研运行时 + 迁移 seam 预留~~ **已被 D12 取代（2026-08-16 用户拍板）**：确定使用 dsh 作为 L1 运行时地基，阶段二接入（首卡 B0 落地验证，vendor fork 锁 `0.1.0-rc.6`）；六插件核心逻辑仍为自研护城河、与 dsh 解耦 | 原决策理由（RC 风险、文档不成熟）仍成立，故以「vendor fork 锁 commit + B0 实证先行」的方式接入，而非直接裸用浮动版本 |
| D2 | **首版只做酒店版 Bundle 演示** | PRD P 章全部示例（云栖酒店、王店长、R1–R6 围栏、7 Agent preset）均为酒店版场景；营销版结构同构，作为「第三行业复制」的后续动作，不进四阶段。 |
| D3 | **数据库只用 PostgreSQL 17 + pgvector**，docker-compose 一键拉起；备选 Homebrew `postgresql@17` | PRD 的 RLS、JSONB GIN、向量记忆都依赖 PG；SQLite 边缘形态是私有化部署章节的事，进停车场。技术方案 V3 写的是 PG16，PG17 为当前主流稳定版，pgvector 官方镜像直接支持。 |
| D4 | **LLM 经 OpenAI 兼容网关接入（DeepSeek / Kimi / GLM / OpenAI 可切），并内置确定性 Mock Provider** | 无 API Key 也能在 Mac 上完整跑通全部页面、状态与演示剧本——这是「断断续续接力开发」的保险丝：任何新窗口接手时，不需要任何外部凭据即可验证系统行为。 |
| D5 | **前端唯一视觉事实源 = 高保真原型 V4.0 + 星盟战舰设计规范 V1.0**；组件命名 `P{页码}E{角标}`；状态变体命名 `页面id_状态` | 对齐 PRD V2.5 P 章与设计规范第 10 章，禁止自由发挥。 |
| D6 | **实时性按 PRD 口径用轮询**（线程/夜班 ≤5s、其余 10–15s），不上 WebSocket | F3.4 明文「每 ≤5s 轮询刷新」；WS 进停车场（触发条件：移动端推送 SLA 吃紧）。 |
| D7 | **重外围件全部后置**：Tauri 桌面壳、Taro 小程序、钉钉/企微/飞书/Slack 连接器、mem0、Presidio 独立服务、WrenAI、E2B/Stagehand 浏览器自动化——进停车场 | 首版用同构薄自研替代：脱敏=内置规则识别模块（中文 PII 正则+占位符协议）、NL 检索=结构化过滤+LLM 直译 where、组织记忆=自建 PG+pgvector 表（V3 的 DDL 本来就是自建表）、IM 通道=本地回环 `channel=inapp`。停车场均写明触发条件（§7）。 |
| D8 | **GitHub 仓库名 `workloom-im`**（GitHub 不允许仓库名含中文；`workloom` 已属「小WorkLoom」项目），描述与 README 用「WorkLoom IM 底座」；私有；令牌不进对话 | 安全纪律：Personal Access Token 不粘贴到任何对话窗口、不写入任何文件与提交，本机用 `gh auth login` 或 SSH 完成认证。 |

### 0.3 编码铁律（每个会话、每个文件落笔前自检）

1. 一切事件写入必经安全网关三段瀑布（权限校验 → PII 脱敏 → 高风险授权），`biz_events` 仅网关角色可 INSERT，禁止旁路直写（F1.2/L1.2）。
2. 事件库 append-only：禁 UPDATE/DELETE，哈希链防篡改；回滚=逆向补偿事件，原事件永不修改（L1.1/F1.6）。
3. 围栏判定为纯函数（输入=对象+动作+参数），子调用与普通调用同一瀑布，无后门；未声明 `fence_bindings` 的 Agent 系统级禁写（F2.1/F2.10）。
4. 基线规则只可加严不可放宽；求值异常按 block 处理（宁可错杀）（F2.3/E2.1）。
5. 权限：服务端 403 / 越权查询返回空，前端「隐藏非置灰」（E2.6/L7.1）。
6. 一切业务数字、阈值、编号回引 PRD V2.5，零编造；界面术语以游戏规则手册 §10 映射表为唯一口径。
7. 依赖全部 pin 版本 + lock 入库；新增依赖必须先核验仓库活跃状态与 License。

---

## 1. 技术栈选型（macOS 适配 · 2026-08-16 核验）

| 层 | 选型 | 版本（pin） | 说明与核验状态 |
| --- | --- | --- | --- |
| 运行时 | Node.js | **24 LTS（Krypton，≥24.18）** | Active LTS 至 2028-04；Node 26 将于 2026-10 转 LTS，首版不追 |
| 包管理 | pnpm | 10+（`packageManager` 字段锁定，corepack 启用） | monorepo 原生 workspaces + `--filter` + catalogs |
| 语言 | TypeScript | 5.9 strict | 全栈同语言 |
| 后端框架 | Hono | 4.13.x（@hono/node-server） | 轻量、Mac 零障碍；当前最新 4.13.1 |
| API 层 | tRPC | **v11**（server+client 同版本锁死） | 端到端类型安全；v10↔v11 线协议不兼容，同仓同版本规避 |
| ORM / 迁移 | Drizzle ORM + drizzle-kit | 0.45.x | 轻量、SQL 优先、支持 RLS 策略声明 |
| 数据库 | PostgreSQL + pgvector | **17 / 0.8**（镜像 `pgvector/pgvector:pg17`） | docker-compose 一键；备选 `brew install postgresql@17` |
| Schema 校验 | zod | 4.x | 五元事件 Schema 的运行时校验（附录 E 落码） |
| 测试 | vitest + supertest | 最新稳定 | 单测（围栏纯函数/脱敏/幂等）+ API 集成测试 |
| 前端框架 | React | **19.2.x** | 19.2.8 为当前 patch；不用实验特性 |
| 构建 | Vite | **7.x（pin）** | 生态成熟稳定（8.x 为当前最新，首版不追新） |
| 样式 | Tailwind CSS | **4.x（@tailwindcss/vite）** | CSS 原生 `@theme` 令牌制，无 tailwind.config.js；禁写 v3 旧类名 |
| 组件基座 | shadcn 风格自研 HUD 组件库（Radix UI primitives + cva + tailwind-merge v3 + tw-animate-css） | 最新稳定 | 星盟战舰是高定制设计系统，shadcn 只借其工程范式（可访问性/primitives），视觉全部自研 |
| 数据请求 | @tanstack/react-query 5 + tRPC client | v11 配套 | 轮询口径：线程/夜班 5s，其余 10–15s |
| 前端路由 | react-router | 7.x | 9 页 + 状态变体路由 |
| 图表 | ECharts | 5.x | P1 经营驾驶舱 KPI 投影 |
| 图标 | emoji 基线 + lucide-react | 最新稳定 | 设计规范 §10：emoji 为基线，禁止混用两套体系 |
| LLM 网关 | 自研 OpenAI 兼容 client（fetch） | — | providers：`deepseek / moonshot / zhipu / openai / mock`；峰谷窗口与降级链在 model-router 实现 |
| 版本控制 | git + GitHub CLI（gh） | 最新 | 建库、推送、tag |

**核验注记**（技术方案 V3 选型的 2026-08-16 复核结论）：① dsh 真实存在但仅 0.1.0-rc.6，本总纲按 D1 处理；② WrenAI 的 wren-engine 已并入主仓 `core/` 且旧仓归档，首版不引入，NL 检索用薄自研（D7）；③ LiteLLM 2026-03 PyPI 投毒 + CVE-2026-42208 记录表明其供应链纪律成本高，首版不引入，VPC 本地模型代理进停车场；④ mem0 为 Python 服务，首版以自建 PG+pgvector 记忆层替代（V3 DDL 本来就是自建表），触发条件见停车场。

---

## 2. 系统架构设计

### 2.1 总体分层（对齐 PRD 附录 A 五层 × 技术方案 V3 的 L0–L4）

```
┌─────────────────────────────────────────────────────────────────┐
│ L4 客户级 Patch（首版仅留加载机制与目录，不实现真实客户定制）          │
├─────────────────────────────────────────────────────────────────┤
│ L3 行业 Bundle：bundles/hotel（首版唯一）                          │
│    presets/ 7 个 Agent preset · fences/ 基线围栏包 · skills/      │
│    schemas/ 对象与阶段枚举 · seed/ 演示数据（云栖酒店）              │
├─────────────────────────────────────────────────────────────────┤
│ L2 Base Bundle 六大自有插件（packages/base）                       │
│    flydata-core  消息总线：五元事件写入/检索/记忆/回溯/回滚           │
│    fence-engine  行动权限：三级判定/单调基线/版本化/dry-run/对象写锁   │
│    night-shift   在线时长：候选清单/夜班状态机/一键暂停/决策包投影      │
│    review-console 原生审批：统一队列/三手势/批量/记忆校准回流          │
│    model-router  消息生产成本：分级路由/峰谷/降级链/逐事件计量/熔断    │
│    tenancy       组织与商业化：工作区隔离/版本能力矩阵/积分账户        │
├─────────────────────────────────────────────────────────────────┤
│ L1 DeepSeek Harness v0.1（vendor fork 锁 rc.6 commit · vendor/dsh）   │
│    agent loop · 工具注册表与受守卫执行流水线 · append-only 会话日志    │
│    · jobs 调度 · agentPresets · skills · approval/userQuestions ·     │
│    llm adapter seam · invariants 不变量注册表（G8 落点）              │
├─────────────────────────────────────────────────────────────────┤
│ L0 基础设施                                                       │
│    PostgreSQL 17 + pgvector · 本地文件证据存储 ./data/snapshots ·   │
│    OpenAI 兼容模型端点（可切）· Mock Provider（离线确定性剧本）       │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 后端分层与模块划分

```
apps/server（Hono 入口）
  └─ middleware/     鉴权（JWT·演示身份）· 租户/工作区解析 · 版本能力 403 · 错误规约
  └─ trpc/           11 个 router：events / fence / approvals / threads / nightShift
                     / inspection / skills / members / tenancy / bundle / system
packages/base（六插件，纯服务层，不碰 HTTP）
  ├─ flydata-core/   gateway（三段瀑布）· events（append+hash chain+幂等）
  │                  · memory（三级作用域+归因+校准）· recall（回收区）
  │                  · 投影查询（决策包/检索/账单/「为什么这样改」）
  ├─ fence-engine/   YAML DSL 加载 · 纯函数判定器 · 单调守卫 · 版本化
  │                  · dry-run 回放（最近 10 条）· 对象写锁（pg advisory）
  ├─ night-shift/    候选清单 · 状态机（unconfigured→ready→running⇄paused→package_generated）
  │                  · 一键暂停（≤60s 取消链）· 08:30 决策包三段投影
  ├─ review-console/ approvals 队列 · 三手势回写（权重 1/2/3）· 批量采纳
  │                  · 快照过期检测（E5.3）· 手势→记忆校准触发
  ├─ model-router/   provider 网关（OpenAI 兼容+Mock）· 分级/峰谷/降级链
  │                  · 逐事件计量（model_trace）· 单任务消耗熔断
  └─ tenancy/        成员与角色 · 版本能力矩阵（社区/Pro/Teams/VPC）
                     · 越权返回空 · 积分账户投影
packages/runtime（dsh 接入层：六插件即 dsh 插件 + 自研 seam providers）
  ├─ plugins/         flydata-core / fence-engine / review-console / night-shift
  │                   / model-router / tenancy 的 dsh 插件挂载点（Cordis 生命周期）
  ├─ providers/       session-persistence-pg（会话日志落 biz_events+哈希链）
  │                   · llm-workloom-router（分级/峰谷/降级链/计量 adapter）
  │                   · credentials-pg（凭据 seam）
  └─ bridges/         事件桥：dsh 会话事件 → 五元事件投影 → PG（G8 不变量校验）
vendor/dsh          # DeepSeek Harness fork（锁 0.1.0-rc.6 commit，B0 落地）
bundles/hotel        行业资产（YAML/JSON/seed，不改底座一行代码）
```

**关键链路（一次 Quest 全生命周期，对齐附录 B）**：
派遣输入 → 安全网关 → 意图路由（LLM 分类+规则兜底，含糊→反问）→ preset 装配（档案+阶段+目标三要素校验，缺一拒绝）→ loop 每步：围栏瀑布判定（auto 放行 / review 挂起进审批 / block 熔断告警）→ 执行 → 写五元事件（含回执位与 model_trace）→ 交付=变更报告+决策链路（日志投影）→ 手势回流校准记忆。

### 2.3 前端模块划分（apps/web）

```
apps/web/src
  ├─ styles/tokens.css      星盟战舰设计令牌（@theme：色板/字体/动效参数）
  ├─ shell/                 舰桥框架（1180px 居中·HUD 四角刻度）· 顶栏
  │                         （夜班状态胶囊+紧急制动杆）· 左侧会话列表 · 右上下文面板
  ├─ components/hud/        公共组件库（≈18 个）：
  │   DispatchBar(P1E1) · ModePills · HandoffCard · KpiCard · AlertPushCard
  │   NightStatusPill · AgentActionMsg · SubCallMsg · ApprovalCardMsg
  │   PlanCompareCard · DiffTable · TriGestureBar · WhyPanel · XpBar
  │   LevelBadge · RadarCard · SlotCard · SkillCard · MemberStrip · EmptyState/Skeleton/Banner
  ├─ pages/
  │   p1/（4 状态变体）p2/（4）p9/（2）p3/（3·移动端 375 视口）
  │   p4/（3）p5/（3）p8/（2）p6/（2）p7/（2）——共 25 屏
  ├─ lib/                   trpc client · 轮询 hooks · 格式化（#E 编号/积分/时间）
  └─ dev/StateMatrix        /dev 状态矩阵页：25 屏变体一览（替代 Storybook，更轻）
```

**页面 ↔ PRD 关联总表**（视觉事实源=原型 V4.0，逐屏对账 `data-go` 接线）：

| 页面 | 名称（游戏化别名） | 状态变体 | 数据契约来源 |
| --- | --- | --- | --- |
| P1 | 主甲板·舰桥（IM 主界面） | p1 / p1_loading / p1_empty / p1_community | 三投影：交接班卡+KPI+需要关注区；线程投影 |
| P2 | 任务舱·主线执行 | p2 / p2_review / p2_done / p2_error | 线程事件流子序列投影 + 审批 API |
| P9 | 守夜战队频道 | p9 / p9_paused | 夜班会话事件流实时投影 + 状态机 |
| P3 | 掌上战报（移动端） | p3 / p3_empty / p3_expired | 决策包 JSON 投影 + 手势回写 |
| P4 | 决断队列 | p4 / p4_empty / p4_conflict | approvals 表投影 + 决策链路查询 |
| P5 | 航道管制台 | p5 / p5_block / p5_readonly | fence 版本化 API + dry-run 报告 |
| P8 | 船员名册 | p8 / p8_agent | 成员+preset 注册表投影 + 工时聚合 |
| P6 | 装备库 | p6 / p6_create | 技能注册表 + 意识建议卡 |
| P7 | 舰船换装坞 | p7 / p7_fail | bundle 清单契约 + 装配校验记录 |

### 2.4 前后端交互逻辑

- 协议：tRPC v11 over HTTP（`httpBatchLink`），全部类型从 server 推到 web；开发期 `vite proxy` 转发 `/trpc`。
- 实时性：react-query 轮询（线程详情/夜班频道 5s，对齐 F3.4；列表与卡片 10–15s）；断线显「连接中断·重连中」，禁止伪造进度。
- 权限三端一致：me 接口下发角色与版本能力；无权限入口隐藏非置灰；越权调用服务端 403 或返回空。
- 演示身份：登录页选择种子成员（王店长/李前台/陈经理）签发 JWT，便于演示权限态与审批流。

### 2.5 monorepo 目录结构（GitHub 仓库根，本地目录 `workloom-im/`）

```
workloom-im/
├─ package.json · pnpm-workspace.yaml · tsconfig.base.json · .gitignore · .env.example
├─ docker-compose.yml          # postgres:pg17 + pgvector
├─ README.md                   # WorkLoom IM 底座 · 一键运行指南（macOS）
├─ docs/
│  ├─ MASTERPLAN.md            # 本总纲
│  ├─ PROGRESS.md              # 进度事实源（接力核心，每会话更新）
│  ├─ DECISIONS.md             # ADR 决策记录（D1–D12）
│  ├─ RELAY.md                 # 接力协议（新窗口/其他 AI 工具承接 SOP）
│  └─ dsh-integration.md       # dsh 对接报告（阶段二 B0 产出）
├─ scripts/                    # start.sh / stop.sh / reset.sh / demo.ts / seed.ts
├─ packages/
│  ├─ shared/                  # 五元事件 zod schema · 常量 · 枚举 · id 生成
│  ├─ runtime/                 # dsh 接入层：六插件挂载点 + 自研 seam providers + 事件桥
│  └─ base/                    # 六大插件服务
├─ bundles/hotel/              # 酒店版行业资产 + 演示 seed
├─ vendor/dsh/                 # DeepSeek Harness fork（锁 0.1.0-rc.6 commit，阶段二 B0 落地）
└─ apps/
   ├─ server/                  # Hono + tRPC
   └─ web/                     # React 19 + Vite + Tailwind 4
```

---

## 3. 数据库设计（ER · 18 表）

### 3.1 ER 关系（文本版）

```
tenants 1─n workspaces 1─n members（人类）· agents（Agent preset 实例）
workspaces 1─1 profiles（一店一档，含 forbidden 硬约束与 pii_vault）
workspaces 1─n threads（任务线程，状态机）1─n biz_events（session_id 关联）
biz_events n─n org_memory（经 memory_usage 归因；org_memory.embedding=vector(1536)）
fence_rules（rule_id+version 复合主键，workspace 维度 + is_baseline 全局基线）
fence_rules 1─n fence_dry_runs（dry-run 回放报告，激活前置）
biz_events 1─n approvals（UNIQUE(event_id, channel) 幂等；gesture 三手势）
workspaces 1─n night_runs（夜班班次：状态机+围栏快照版本+统计）
workspaces 1─n triggers（自动化触发器，围栏管辖对象）
skills（official/team/industry 三级）n─n workspaces（经 skill_installs；绑定围栏随安装生效）
industry_assets（行业知识资产，共享前 desensitized=true）
credentials（凭据引用，加密存储，事件只记引用 ID）
```

### 3.2 核心表 DDL 清单（首版全量建；节选关键约束）

| 表 | 用途 | 关键约束（回引编号） |
| --- | --- | --- |
| `biz_events` | 五元事件库 | append-only：DB 角色禁 UPDATE/DELETE + 触发器兜底；`UNIQUE(tenant_id,event_id)` 幂等丢弃；`prev_hash/hash` sha256 链；JSONB GIN 索引覆盖 rule_impact（L1.1/L1.4/G1） |
| `org_memory` / `memory_usage` | 组织记忆与归因 | 三级作用域；source_events[] 归因；confidence 默认 0.5；引用必写使用记录（F1.4） |
| `fence_rules` | 围栏规则（版本化） | (rule_id,version) 主键；is_baseline 单调守卫；生命周期 draft→pending_approval→active→rolled_back；变更需审批事件 ID（F2.3/F2.4） |
| `fence_dry_runs` | dry-run 报告 | 回放最近 10 条历史动作的模拟判定结果；未确认不得激活（F2.5/L2.4） |
| `profiles` | 一店一档 | archive JSONB 行业子 Schema；forbidden 硬约束优先级最高；pii_vault AES-256-GCM（L1.6/F1.10） |
| `threads` | 任务线程 | 状态机 queued→running→pending_review→completed/failed/paused；并发 ≤10/工作区（F3.4/G11） |
| `approvals` | 审批队列 | 状态 pending/approved/edited/rejected/expired；gesture 权重 1/2/3；驳回必填原因 ≤200 字（F5.2/L5.2/L5.3） |
| `night_runs` | 夜班班次 | 状态机持久化；fence_snapshot_version 记录当晚围栏版本；统计字段供决策包（F2.6/F4.8） |
| `triggers` | 自动化触发器 | cron/事件订阅双入口；本身是围栏管辖对象，CRUD 全事件化（F4.7/L4.4） |
| `skills` / `skill_installs` | 技能广场 | 三级体系；安装即绑定围栏、卸载即撤销（F8.1/F8.2/L8.3） |
| `industry_assets` | 行业知识资产 | share_scope 检查约束；desensitized=true 才可入共享层（L8.1） |
| `agents` | Agent preset 实例 | fence_bindings 声明缺失即禁写（加载时强制校验 F2.10）；readonly 只读 preset（L9.1） |
| `members` | 人类成员 | 角色 owner/manager/readonly/group/channel；三端权限一致（F5.6） |
| `credentials` | 凭据引用 | 加密存储；永不出现在提示词与事件明文，只记引用 ID（F7.7/L7.3） |
| `tenants` / `workspaces` | 组织模型 | workspace 为隔离单位；首版 RLS 策略按 workspace_id 建立（F7.1） |

> 首版说明：RLS 策略会建立并启用（按 workspace_id 隔离），「越权查询返回空而非 403」在 API 层与 RLS 双层落实；本地演示默认 tenant=demo。五元事件 JSON Schema 按附录 E 逐字段落 zod（v1 冻结，行业扩展仅可加字段）。

---

## 4. 分阶段开发任务清单

> 任务卡即接力单元：每卡含编号（回引 PRD）、文件路径清单、验收断言。每阶段完成即打 git tag 并更新 docs/PROGRESS.md。

### 阶段一 · 环境初始化（目标：`pnpm dev` 一键起，前后端联通，数据库全量就位）

| 卡 | 内容 | 验收断言 |
| --- | --- | --- |
| A1 | monorepo 骨架：package.json/pnpm-workspace/tsconfig/.gitignore/.env.example/docker-compose | `docker compose up -d` 起 PG；`pnpm install` 零报错 |
| A2 | packages/shared：五元事件 zod schema（附录 E 逐字段）+ 枚举 + id 工具 | schema 对 PRD 示例事件校验通过/拒绝各 1 例 |
| A3 | Drizzle 18 表全量 + migrate + RLS 策略 + append-only 触发器 | `pnpm db:migrate` 成功；对 biz_events 手测 UPDATE 被拒绝 |
| A4 | bundles/hotel：7 preset YAML + 基线围栏 6 条 + 对象/阶段枚举 + 一店一档 Schema | bundle 加载器六项校验全过（对账 P7） |
| A5 | seed：demo 租户/云栖酒店工作区/3 人类成员/7 Agent/档案/围栏/示例事件 100 条 | 抽样 100 事件五元字段完整率 100%（附录 H-1） |
| A6 | apps/server 最小入口（Hono+tRPC+健康检查）+ apps/web 壳（tokens.css+舰桥框架+空 P1） | 浏览器打开可见星盟战舰基底，tRPC 握手 200 |
| A7 | git 初始化 + 建库脚本 + docs 四件套（总纲/PROGRESS/DECISIONS/RELAY） | push 成功，**tag `v0.1.0`** |

### 阶段二 · 后端 API 开发（首卡 B0 落地验证 dsh；此后依赖拓扑：网关→事件→围栏→权限→审批→路由→运行时(dsh 原生)→夜班→巡检→技能）

| 卡 | 内容（回引） | 验收断言 |
| --- | --- | --- |
| B0 | **dsh 落地验证（D12）**：vendor fork 锁 `0.1.0-rc.6` commit（`vendor/dsh`）→ Mac 跑通 `pnpm dsh web` → 按官方 cookbook 挂载最小插件（hello-fence）实证 → 产出《dsh 对接报告》（六插件×seam 映射表落 `docs/dsh-integration.md`） | dsh web 可访问；最小插件在 dsh 内加载成功；报告入库 |
| B1 | flydata-core 写入段：安全网关三段瀑布 + 事件 append + 哈希链 + 幂等（F1.1/F1.2/L1.4） | 旁路直写被 DB 拒绝（H-2）；重复写入丢弃不报错 |
| B2 | 事件检索：结构化过滤 + NL 入口薄自译（LLM→where，超时降级表单）（F1.3/E1.6） | 结构化检索 P95 达标机制就位；NL 超时降级可演示 |
| B3 | 组织记忆：三级作用域 + 归因 + pgvector 检索 + 使用记录（F1.4/F6.1） | 任一记忆可反查来源事件 |
| B4 | fence-engine：YAML DSL + 纯函数判定 + 单调守卫 + 版本化 + dry-run + 对象写锁（F2.1–F2.10） | 放宽基线的 patch 加载被拒且留痕（H-3）；求值异常按 block（E2.1）；子调用同瀑布（H-4） |
| B5 | tenancy + 鉴权：演示身份 JWT + 角色 + 版本能力矩阵 + 越权返回空（F5.6/F7.1/F7.2） | 跨工作区读取全返回空（H-9）；社区版调 Quest 接口 403+升级提示（H-10） |
| B6 | review-console：统一队列 + 三手势回写 + 批量采纳 + 快照过期检测（F5.1–F5.7） | 驳回空理由被拒（L5.2）；重复回调只处理首次（L5.3） |
| B7 | model-router：OpenAI 兼容网关 + Mock provider + 分级/峰谷/降级链/计量/熔断（F6.1–F6.8） | 切换/降级必写事件（L6.1）；账单=事件投影（L6.3）；Mock 模式零 Key 全流程可跑 |
| B8 | runtime + 三态派遣：意图路由（含糊反问）+ preset 装配三要素校验 + loop + 回执校验 + replay 断点续跑（F3.1–F3.9/E3.3） | kill -9 后重放续跑且幂等（H-5）；无回执标「未核实」不得宣称完成（E3.7） |
| B9 | night-shift：候选清单 + 状态机 + 一键暂停 ≤60s 取消链 + 决策包三段投影 + 触发器引擎（F4.1–F4.8） | 决策包纯日志投影生成（H-7）；暂停端到端计时机制就位（G5） |
| B10 | 巡检 + 技能/意识：定时只读巡检 + 异常分级推送 + 一键派单 + 技能安装/绑定 + 高频检测建议（M9/F8.1–F8.4） | 巡检失败必出事件不静默（L9.2）；技能卸载即撤销围栏绑定（L8.3） |

完成标志：附录 H 中可自动化条款（1/2/3/4/5/7/9/10/14）全部转为测试并通过 → **tag `v0.2.0`**

### 阶段三 · 前端页面开发（视觉事实源=原型 V4.0；逐屏对账）

| 卡 | 内容 | 验收断言 |
| --- | --- | --- |
| F1 | tokens.css 全令牌（色板/字体三级/动效参数）+ 舰桥壳 + 顶栏（夜班胶囊+紧急制动杆） | 对照设计规范 §2/§4/§7 逐项可查；双强调色无混用 |
| F2 | HUD 组件库 ≈18 个 + /dev 状态矩阵页 | 每组件覆盖「默认/加载/空/错误/权限」；动效均有降级 |
| F3–F11 | P1→P2→P9→P3→P4→P5→P8→P6→P7 逐页实现（25 屏状态变体，组件命名 P{x}E{y}） | 每页状态规格表逐态可见；数据全来自真实 API；接线与原型 data-go 对账一致 |
| F12 | 全局收尾：权限态（社区版切换演示）+ 统一加载/空/错误/超时 + 游戏化文案口径自查 | 对照游戏规则手册 §10 映射表逐条可查；专业信息一字不减 |

完成标志：25 屏走查清单全绿 + G10 首屏机制（分块骨架屏）落地 → **tag `v0.3.0`**

### 阶段四 · 联调与启动脚本

| 卡 | 内容 | 验收断言 |
| --- | --- | --- |
| E1 | E2E 演示剧本：PF.1 晨间审批 / PF.2 一句话派遣 / PF.3 巡检派单 / PF.4 夜班闭环（含一键暂停）/ PF.5 围栏演进 / PF.6 技能固化 | 六条流程在 Mac 上实跑通；演示脚本 `pnpm demo` 可一键重置并生成「昨夜」数据 |
| E2 | `scripts/start.sh / stop.sh / reset.sh / doctor.sh`：起 PG→migrate→seed→server→web；端口冲突与缺依赖的友好提示；doctor.sh 输出一屏自检报告——对齐 dsh-TUI `/doctor` 清单（Node 版本/架构/模型/工作目录/凭据状态/会话存储）+ 本项目侧检查（PG 连通/迁移版本/RLS/种子完整性/node-pty 原生模块/Xcode CLT）（D13②） | 全新终端 `./scripts/start.sh` 一条命令可用；`./scripts/doctor.sh` 一屏定位环境断点 |
| E3 | README（macOS 前置：Docker Desktop 或 brew PG；LLM Key 可选配置；Mock 模式说明）+ docs 四件套收尾 | 按 README 从零可在 ≤半天 跑起来 |
| E4 | 可选：Tauri 2 桌面壳配置与说明（非必须，不影响 v1.0.0） | 文档就绪即可 |
| E6 | dsh headless 回归门禁（D13①）：`dsh --profile headless` 非交互执行「最小 Quest → 围栏瀑布 → 事件落库 → 验链」脚本化用例，纳入回归套件；并作为 H-5（kill -9 重放续跑且幂等）的验收载体 | headless 用例单轮全绿；kill -9 重放零重复事件；失败即阻塞 E5 打 tag |
| E5 | **tag `v1.0.0`** + PROGRESS.md 归档 | 仓库完整、可克隆、可运行 |

---

## 5. GitHub 托管与接力机制

### 5.1 建库与推送（仓库 `workloom-im` 已由 Kimi 经 GitHub API 创建完成并设为私有；以下为本地首次推送命令；令牌不进任何对话与文件）

> 注意区分：账号下 `workloom` 仓库属于另一独立项目「小WorkLoom」（企业智能执行中枢 MVP，PRD V3.0 线），请勿向该仓库推送本项目代码。

```bash
# 本机认证（二选一，只需一次）
gh auth login                 # 推荐；或配置 SSH key
# 克隆空库 → 放入阶段一产物 → 推送
git clone git@github.com:geniusdapeng-collab/workloom-im.git
cd workloom-im
# …（阶段一源码按任务卡落位后）
git add -A && git commit -m "chore: 阶段一 环境初始化（A1–A7）"
git push -u origin main && git tag v0.1.0 && git push --tags
```

### 5.2 接力协议（docs/RELAY.md 落地，所有窗口共同遵守）

- **进度事实源** = 仓库内 `docs/PROGRESS.md`：当前阶段、任务卡状态表（✅/🚧/⬜）、本阶段已产出文件清单、最近一次 commit 与 tag、下一步动作。
- **决策事实源** = `docs/DECISIONS.md`：ADR 条目（D1–D8 起），新决策追加不改旧。
- **commit 规范**：`阶段号/卡号: 说明`（如 `B4: fence-engine 单调守卫与 dry-run（F2.3/F2.5）`）；每阶段收尾打 tag。
- **新窗口承接 SOP（三步）**：① 把仓库最新 `docs/PROGRESS.md` 粘贴给 Kimi（或授权我读取你贴的内容）；② 我复述当前状态与下一步任务卡，你确认；③ 继续产出完整源码 + 路径。
- **每次会话收尾动作**：我更新 PROGRESS.md 内容给你 → 你 commit + push。上下文窗口再断也不丢进度。

### 5.3 Kimi 侧保障（已生效）

我已将「WorkLoom IM 底座 接力开发协议」写入跨会话长期记忆：任何新窗口只要提到本项目，我会主动遵守——先读 PROGRESS.md/DECISIONS.md、按四阶段推进、代码完整不截断、编号回引 PRD、视觉以原型 V4.0 为准、dsh 暂不依赖。你在新窗口说「继续WorkLoom IM 底座」即可触发承接。

---

## 6. 全局口径在开发阶段的落地策略

G1–G11 为生产 SLO，开发期落实「机制」而非「数字」：检索走索引+GIN（G1 机制）；线程 5s 轮询（F3.4）；一键暂停取消链（G5 机制+计时日志）；决策包纯投影（H-7 代码走查）；留痕 100% 以 append-only+网关强制（G8）；峰谷费率字段天然产出（G9）；并发上限+排队可见（G11）。真机计时验收留待你本机实测记录进 PROGRESS.md。

## 7. 风险与停车场

| 风险 | 对策 |
| --- | --- |
| 无 LLM API Key | Mock Provider 内置，全流程可跑；有 Key 时 `.env` 填 `LLM_PROVIDER` 即切真实模型 |
| dsh 上游快速演进 | 首版不依赖；每季度复核，达触发条件评估迁移（见下表） |
| Tailwind v4 写法漂移 | 令牌全部落 `@theme`；禁 v3 旧类名（bg-gradient-to-* 等）；tailwind-merge 锁 v3.x |
| tRPC v11 前后端版本撕裂 | 同仓同版本 pin，`package.json` 强制 |
| Mac 未装 Docker | README 给 brew 备选路径；脚本检测并提示 |

| 停车场（触发条件才引入） | 触发条件 |
| --- | --- |
| dsh 上游升级跟进 | 官方发布稳定 1.x 后：跑契约测试套件评估升级 vendor fork（升级前必须全绿） |
| Tauri 桌面壳 / Taro 小程序 | 浏览器版验收后；移动端先以 375 视口 Web 演示 |
| IM 连接器（钉钉/企微/飞书/Slack） | 真实企业通道接入需求出现；首版 channel=inapp 回环已保幂等与回调语义 |
| mem0 / Presidio 独立服务 / WrenAI | 记忆检索或脱敏规则复杂度超过自建薄层（如多语言 PII、语义层治理需求） |
| LiteLLM（VPC 本地模型代理） | 私有化部署立项；届时按 V3 纪律（哈希 pin+验签+仅内网） |
| WebSocket/SSE | 轮询口径无法满足推送 SLA 时 |
| DSH Desktop 式桌面一键安装包（Electron 内嵌 Node + dsh 服务生命周期托管 + 首启自动建 Profile；参考 anywhere-labs/deepseek-harness-desktop，D13③） | 私有化交付/面向弱 IT 能力客户的一键分发需求出现时；届时评估替代或合并 E4 Tauri 方案 |
| Redis / Kafka / OPA / Temporal / Lago / Keycloak | 同技术方案 V3 §11 触发条件，逐字继承 |

---

*WorkLoom IM 底座 项目组 · 总纲 V1.0 · 2026-08-16 · 与 PRD V2.5 / 技术方案 V3 / 设计规范 V1.0 / 规则手册 V1.0 配套生效*
