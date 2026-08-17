# 开发进度（接力唯一事实源）· WorkLoom IM 底座

> **接力方法（任何工具通用）**：先读本文件 + `DECISIONS.md` + `MASTERPLAN.md` + `RELAY.md`；需求与视觉原件在 `docs/prd/`。
> 维护纪律：每完成一个任务卡/批次即更新本文件并推送；「最后游标」精确到文件级。
> Kimi 窗口触发词：「继续迭代WorkLoom IM」「开发WorkLoom 大底座」等 → 自动同步本文件并给出下一步。

## 阶段总览

| 阶段 | 状态 | tag |
|---|---|---|
| 阶段一 环境初始化 | ✅ 完成（A1–A7，Linux 沙箱实测全绿；Mac 实测项见「待回填」） | `v0.1.0` |
| 阶段二 后端 API | ✅ 完成（B0–B10 全绿，附录 H 可自动化条款回归通过） | `v0.2.0` |
| 阶段三 前端页面 | 🚧 F1–F7 完成（P1/P2/P9/P3/P4 五页真实接线）；下一卡 F8=P5 | —（F12 后打 `v0.3.0`） |
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
- [x] B8 runtime + 三态派遣：意图路由（含糊反问不建任务/LLM 白名单约束/3s 超时降级 F3.2）+ preset 装配三要素缺一拒绝（L3.7）+ Quest 循环（每步围栏瀑布 auto/review/block + 回执校验 E3.7 + step_id 幂等）+ replay 断点续跑零重复事件（H-5）+ L3.1 并发上限 + dsh 挂载点（plugins/workloom-fence 挂 tools/pre-execute）— `packages/runtime/`，端到端实测：含糊反问 ✅ / 调价 Quest T-104 全 3 步 completed ✅；judge 修复读类动作误吃 default_level；9+84 测试绿
- [x] B9 night-shift：18:00 候选清单（F4.1 夜班 preset 覆盖+谷时价+围栏摘要）+ 状态机持久化（F4.8 非法迁移拒绝）+ 开启夜班=人类命令+围栏快照（F2.6）+ 一键暂停（G5 计时留痕/E4.1 超时 P0/running 线程断点挂起）+ 08:30 决策包三段投影（H-7 纯日志视图/G6 ≤20 条严重度截断/无回执标未核实 E3.7）+ 触发器引擎（F4.7 cron+事件双入口/L4.4 CRUD 启停全事件化）— `packages/base/night-shift/`，95 测试全绿
- [x] B10 巡检 + 技能/意识（阶段二收官）：巡检四检确定性探针 + 只读前置断言（L9.1 工具集裁剪复查）+ 异常分级事件/高优同源聚合推送（F9.2/G3/E9.2）+ 失败重试后必出 P0 告警事件不静默（L9.2/E9.1）+ 当日幂等去重（L9.3）+ 状态条纯日志投影（F9.4，关注区 ≤5 条按严重度）+ 一键派单建单回链/失败升级一级转需介入（F9.3/E9.3）+ 技能三级体系安装即绑定/卸载即撤销（F8.1/F8.2/L8.3，resolveAgentFenceBindings 为运行时唯一消费点）+ 未脱敏 industry 拦截（L8.1/E8.4）+ 签名白名单（L8.2）+ 围栏冲突进审批不静默（E8.1）+ 三要素零代码锻造+版本管理+dry-run 前置（F8.3/F2.5 同口径回放 10 条）+ 意识系统高频检测 ≥3 次/周→建议固化卡片→一键确认生成触发器/技能+驳回阈值 ×2 校准闭环（F8.4/E8.3）+ 行业资产复用闸门（L8.4）— `packages/base/inspection/`（4 文件）+ `packages/base/skills/`（3 文件）+ tRPC inspection/skills 双 router，集成冒烟：手动巡检 ✅ / 状态条点名 ✅ / 种子 100 事件检出 review.reply 30 次·price.adjust 26 次高频建议 ✅；31 条新测试两轮连跑全绿

## 阶段三任务卡

- [x] F2 HUD 组件库 18 件（`apps/web/src/components/hud/`）：DispatchBar 航线设定台 / QuestCard（六态+重连）/ HandoffCard（空态禁显0）/ TriGestureBar（过期锁定 E5.3+权限隐藏 L5.1）/ FenceLight（四态+基线金锁）/ 消息族四件（回执三态徽标/子调用虚线/系统分隔线）/ KpiGauge（扫描线+截至时间+stale 置灰）/ RadarAlertCard（P0–P2+雷达扫动 4s+无异常态禁消失）/ NightStatusPill（四态）/ EmergencyBrake（二次确认）/ EmptyState / SkeletonBlock（1.4s 流光）/ BannerAlert 三级 / XpBar（斜纹流光 1.2s）/ LevelBadge / AchievementBadge / SquadRing / EquipSlot / EquipCard（金银铜稀有度）/ EventIdChip——动效令牌 sweep/xpflow/skflow 入 tokens.css 并登记降级；/dev 状态矩阵页逐格对账（§10 检查表），Bridge 顶栏改引库组件；无头截图三段走查 ✅ 双强调色分工无混用 ✅
- [x] F7 P4 决断队列（PRD P4-①②③④⑤ 逐条对账）：统一队列分级（高危→双人/越围栏 review→必审/其余→逐步审，F5.4/F5.1）+ 原生审批卡详情（diff 前删线后高亮 P4E1 + 命中规则随行 + 影响面 + 执行回执位说明 F1.1/E3.7）+ 三手势（驳回必填原因 L5.2；写回 approvals.decide + 记忆校准 F5.5/F1.7）+ p4_conflict 快照冲突红条+刷新再审（E5.3/F2.7，冲突项禁审）+ WhyPanel 决策链路（依据事件/引用记忆/模型档与积分，F1.12/L3.6）+ IM 卡片同步卡（幂等键/原地更新语义，L5.3/D7 本地回环）+ 批量采纳低风险（G6 二次确认接 batchApprove）+ p4_empty 清空+手势统计；权限态：只读隐藏手势 diff 只读（E2.6/L5.1）
- [x] F6 P3 掌上战报（移动端 375px 拇指化重排，PRD P3-①②③④⑤ 逐条对账）：三栏计数头与 P1 交接班卡同源强一致（F4.4，点击筛选）+ 审批卡逐条三手势（热区 ≥44px §4.2；驳回必填原因 L5.2；写回接 approvals.decide 权重 1/2/3 F5.3）+ expired 虚框卡（F5.7；高危无超时放行 L5.4 提示）+ 求援卡（夜间未执行任何动作 L4.2）+ 批量推进（仅低风险可批量 G6 二次确认，接 batchApprove 高危跳过）+ 紧急制动（P3E5 接 nightShift.pause）+ 完成后态「今日待审已清空」+手势统计（F5.5）；权限态：只读成员隐藏手势与双键（E2.6）；独立移动机身（44px 圆角+深空内容区 §4.2）
- [x] F5 P9 守夜战队频道（PRD P9-①②③④ 逐条对账）：班组消息流=夜班频道事件流投影（ts 升序；越围栏标「未生效·待审批」L4.1；需介入红框卡 L4.2 → 一键派单 P9E3）+ 一键暂停实接 pauseAll（二次确认在组件层；G5 计时回执卡；非法迁移 F4.8 干净 400）+ 恢复 resumeNight（E4.2 续跑）+ 班组留言=五元事件留痕（P9E6 实测 E-101 落库可检索）+ 右栏班组状态机/峰谷计量（off-peak 投影 G9）/围栏快照（F2.6 可回溯）/SquadRing 7 船员环+在线脉冲（P9E4）+ 交接班预告卡（P9E5）；权限态：只读成员隐藏留言栏与制动杆（E2.6/L3.4）；server nightShift 补 events/pause/resume/note 四端点；顶栏夜班胶囊点击必达 P9（§5.9 铁律）；新增 `scripts/devbox.sh`（沙箱重建一键恢复：Node24+PG17/pgvector 用户态解包+迁移种子+serve，接力环境纪律入库）
- [x] F4 P2 任务舱·主线执行（PRD P2-①②③④⑤ 逐条对账）：行动消息流=线程事件流子序列投影（session_id 查询，ts 升序；回执三态/命中规则/能量逐事件渲染，无回执标未核实 L3.6/E3.7）+ ThreadInspector 右栏（进度 XP 条/计量 model_trace 投影/围栏判定聚合/参与成员，≤5s 轮询+断线显重连不伪造进度 F3.4）+ 内联审批卡（diff+命中规则版本+三手势写回 approvals.decide，驳回必填原因 ≤200 字 L5.2；已决态渲染）+ p2_done 交付卡+决策链路时间轴（无对外变更明示「仅只读分析」E3.7）+ p2_error 三入口（转人工/降级重试接 threads.run replay 幂等/回滚标注 E1 接线位）+ 只读成员隐藏输入栏（E2.6）+ 追问沿用线程上下文（threads.run）；server 补 threads.get/threads.events；P1 线程点击跳 /p2/:id；hud 补 PlanCompareCard（F3.7 越围栏双人确认提示）；走查：T-101 完成态交付卡+20 事件时间轴 ✅ T-102 待审查态+舰长决断气泡 ✅
- [x] F3 P1 主甲板真实接线（PRD P1-①②③ 逐条对账）：左栏分组会话列表（📌守夜战队/昨夜战报 ✓9◆3▲2/待办审批 badge/线程状态点+进度）+ 中栏（交接班卡三计数与左栏强一致 F4.4 + KPI 四卡=一店一档 history_curve 真实投影 + 巡检雷达推送接 inspection.dispatch 一键派单 + 无异常「昨夜一切正常」）+ 右栏（档案 chips/守夜战队卡/人机混编在线成员 10/渠道巡检）+ 底部航线设定台受控输入（空文本禁点 §5.1/Enter 或启航建单）+ 快捷目标 6 条（F3.5）；状态变体 p1/p1_loading 骨架/p1_empty/p1_community（隐藏夜班+Quest 快捷目标，F7.2 隐藏非置灰）；轮询线程夜班 5s 其余 10s（F3.4/D6）；含糊反问不建任务实测 ✅（「搞一下」→clarify）、明确派遣建 T-104 ✅；server 补 workspace/nightShift 两薄 router + trpc 客户端 JWT 头（演示身份自动登录 MEM-001）；DispatchBar 升级受控组件 — `apps/web/src/pages/p1/P1.tsx` / `lib/trpc.ts` / server router；Bridge 支持 left/right 插槽
- [x] F1 tokens.css 全令牌 + 舰桥壳 + 顶栏（设计规范 §2/§3/§4/§7 逐项回引注释可查）：色板补齐星云晕染对/金底深棕/需介入紫、字号阶梯 Display→Micro、圆角/栏宽 236·264/间距、动效令牌 drift 90s·pulse 1.6s·2s·0.8s·sheen 2.6s（全部登记 prefers-reduced-motion 降级）；星野背景双层（公理Ⅰ 禁死黑）；HUD 四角刻度对齐原型 18px·2px·贴边；P1E5 夜班胶囊（999px+呼吸灯，含 paused 琥珀变体）+ P1E6 紧急制动杆（.brk 描边款）；Orbitron/JetBrains Mono 字体引入（§3）— `apps/web/src/styles/tokens.css` / `shell/Bridge.tsx` / `index.html`；走查：vite build ✅、无头截图双强调色分工无混用 ✅、vite dev 全链路 tRPC 握手 200 ✅

## 最后游标

- **阶段二已收官**：附录 H 可自动化条款（1/2/3/4/5/7/9/10/14）全部有对应测试/验收且通过；B10 验收 L9.2（巡检失败必出事件）/ L8.3（卸载即撤销）已转测试锁定。tag `v0.2.0`。
- **下一步**：**阶段三 F8 = P5 航道管制台**（规则围栏页：版本历史 + 基线金锁 🔒 R1–R6 + 自然语言新增群规（转写→预览→dry-run→审批）+ dry-run 报告；需 fence router（rules 查询/dry-run 创建与确认）；状态变体 p5/p5_readonly）。后续：P8→P6→P7 → F12 → tag `v0.3.0`。
- 环境重建：沙箱 /tmp 回收后 `bash scripts/devbox.sh`（+`serve`）一条命令恢复全环境。
- 外部真实接口纪律（用户 2026-08-17 明确）：LLM 等外部 API 一律走 Mock Provider/OpenAI 兼容网关跑通测试（D4），用户安装后自行在 .env 接入真实 Key（LLM_PROVIDER/LLM_API_KEY）。
- 集成测试纪律：DB 用例对同一数据库可重跑（B10 起全部用例带唯一后缀隔离；B3 memory 测试已顺手修同源污染）；回归前推荐 `./scripts/reset.sh` 整库重建后单轮全绿为准。
- **D13 已立项（2026-08-17，dsh 社区生态评估）**：① 阶段四新增 E6「dsh headless 回归门禁」（`dsh --profile headless` 脚本化用例 + H-5 kill -9 重放验收载体）；② E2 扩为含 doctor.sh 一屏自检（对齐 dsh-TUI `/doctor` 清单）；③ DSH Desktop 式桌面安装包进停车场（触发条件=私有化/一键分发需求）。详见 DECISIONS D13 / MASTERPLAN 阶段四与 §7。社区项目实证不改 Harness 内核、纯消费文档化 seam 的路线（DSH Desktop ≈8.5k★ / dsh-TUI ≈1.5k★），D12 双轨纪律不变。

## 实测记录（2026-08-16 · Linux 沙箱，Node 24.19 / pnpm 10.14 / PG 17.11 + pgvector 0.8.6）

**B10 批次（本批，同环境实测）**：

| 门禁 | 结果 |
|---|---|
| `pnpm test`（根，含 PG 集成） | ✅ 两轮连跑全绿：shared 4 + base 117 + runtime 9（B10 新增 31 条） |
| tRPC 新 router 冒烟 | ✅ loginAs → `inspection.status`（异常点名按严重度 ≤5 条）/ `inspection.run`（手动巡检 ok）/ `skills.list` / `skills.awareness.suggestions`（种子事件真实检出 review.reply×30、price.adjust×26 高频建议） |
| L9.2 巡检失败不静默 | ✅ 探针全灭注入：重试后 `inspect.run.failed` P0 告警事件落库 |
| L8.3 卸载即撤销 | ✅ install→并集生效→uninstall→revokedBindings 留痕，运行时消费点 `resolveAgentFenceBindings` |
| E8.1 冲突进审批 | ✅ 绑定缺失围栏（R9）安装挂起 + approvals pending（skill_fence_conflict） |
| 附录 H 可自动化条款回归 | ✅ H-1/2/3/4/5/7/9/10/14 全部由既有测试覆盖并通过（见各包测试） |

**阶段一批次**：

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
