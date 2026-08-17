# 开发进度（接力唯一事实源）· WorkLoom IM 底座

> **接力方法（任何工具通用）**：先读本文件 + `DECISIONS.md` + `MASTERPLAN.md` + `RELAY.md`；需求与视觉原件在 `docs/prd/`。
> 维护纪律：每完成一个任务卡/批次即更新本文件并推送；「最后游标」精确到文件级。
> Kimi 窗口触发词：「继续迭代WorkLoom IM」「开发WorkLoom 大底座」等 → 自动同步本文件并给出下一步。

## 阶段总览

| 阶段 | 状态 | tag |
|---|---|---|
| 阶段一 环境初始化 | ✅ 完成（A1–A7，Linux 沙箱实测全绿；Mac 实测项见「待回填」） | `v0.1.0` |
| 阶段二 后端 API | ✅ 完成（B0–B10 全绿，附录 H 可自动化条款回归通过；B11 IM 通道增量卡 2026-08-17 并入） | `v0.2.0` |
| 阶段三 前端页面 | ✅ 完成（F1–F12：P1/P2/P9/P3/P4/P5/P8/P6/P7 九页真实接线 + 全局收尾 25 屏走查） | `v0.3.0` |
| 阶段四 联调与启动脚本 | ✅ 完成（E1 E2E 演示剧本 / E2 启动脚本四件套+doctor.sh / E3 README+docs 收尾 / E6 dsh headless 回归门禁；E4 Tauri 停车场 D13③） | `v1.0.0` |

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
- [x] B11 IM 通道接入（D14，用户显式插单·阶段二后端增量卡）：自研 `packages/base/im-channels/` 通道域四件（registry 注册表对账 approvals.channel 枚举 5 值+未启用即拒 / inbound 入站归一化→网关瀑布落五元事件+通道消息幂等+PII 脱敏天然覆盖 F1.10 / cards 审批卡片出站留痕 approval.card.sent+ChannelDriver 抽象+Mock 驱动 D4 同纪律 / callback 手势回调复用 decide 全纪律 L5.1/L5.2/L5.3/E5.3+回执回写通道 F5.5）+ openid→成员映射（members.im_openids，E5.2 预留位；未映射=外部访客 ext: 口径只读无权审批）+ tRPC im router 五端点（channels/inbound/sendApprovalCard/callback/outbox，ChannelError→403/400 映射）+ dsh-im 锁版集成（`vendor/dsh-im/VENDOR.md` pin 0.2.2+integrity + `scripts/install-im-channels.sh` pin 安装校验幂等）+ `.env.example` IM_DRIVER=mock — 17 条新测试全绿（纯单测 5 组+PG 集成：入站落库/幂等/脱敏/映射/手势闭环/readonly 403/卡片留痕）；端到端冒烟：钉钉入站→E-309 落库·重推 deduped ✅ / 审批卡 apr-e-8895→mock-dingtalk-1·手势回调 approved·重复回调「已处理过」回执 ✅ / 未映射 openid 403 ✅；dsh 实证：`dsh plugin --profile web add @xmanrui/dsh-im@0.2.2` 挂载 profile 依赖 ✅ → `dsh web` 200 且页面注入 dsh-im/client.js 入口 ✅

## 阶段三任务卡

- [x] F12 全局收尾（MASTERPLAN 阶段三完成标志：25 屏走查清单全绿 + G10 首屏机制落地）：权限态=社区版切换演示（顶栏 PlanSwitcher 胶囊 `shell/PlanSwitcher.tsx` + server `auth.setPlan`：owner 专属 readonly 403 ✅、写 tenants.plan、留痕 plan.switch G8、重签 JWT 整页重载；社区版即时生效=夜班胶囊/紧急制动/快捷目标隐藏，threads.dispatch 403+升级提示 H-10 活体实测 ✅）+ 统一加载/空/错误/超时（SkeletonBlock/EmptyState/BannerAlert 全站机制登记）+ 游戏化文案口径自查（游戏规则手册 §10 映射总表 17 条逐条落位，专业信息一字不减）+ 附录 H 状态总表 15/15（新增 security-audit.test.ts：H-11 凭据全库扫描零命中、H-13 注入对抗拒写零残留、E1.3 占位符正向实测；bundles.test.ts 补 H-15 第三行业五要素填充→6/6 全绿→激活切换→还原，底座代码零改动；顺手修 activateBundle 草稿激活转正 bundle.json 同步 bug；H-6 一键暂停实测 6ms withinSla；H-5/H-12 留阶段四 E 卡既定排期）——产出 `docs/WALKTHROUGH-v0.3.0.md`（25 屏清单 17 张实机截图+8 态代码/测试锚点、§10 自查表、G10 机制、附录 H 总表）；tag `v0.3.0`
- [x] F11 P7 舰船换装坞（PRD P7-①②③④⑤ 逐条对账）：六槽位卡 P7E1（档案 Schema/对象阶段/工具集/围栏包/Agent 班组/工作台 UI 逐卡装配状态=bundle 注册表实物投影，磁盘扫描 bundles/<slug>/；围栏包卡 →P5 P7E4、班组卡 →P8 P7E2）+ 起飞前检查单 P7E3（五项活算：档案 forbidden 校验=archive.schema 必填组+硬约束计数 / 枚举冲突检测=对象阶段重复定义+当前阶段合法性 / 工具探针健康=7 preset 实例注册+ready 探针 / 围栏绑定完整=fence_bindings 非空且规则 active，未声明即禁写标红 F2.10 / UI 用例同步=ui/cases.json 页面注册表核对）+ 任一失败拒绝激活（服务端 PRECONDITION_FAILED 带检查单，实测 412 ✅ 不静默 L9.2）+ 修复清单 FixList（失败项+修复指引+回链槽位，存在即阻断激活）+ 重跑校验留痕 bundle.check_run（实测 E-639 ✅）+ ProfileSwitcher（当前高亮/草稿标「不进分发」/激活=整套皮肤+通讯录+群规生效留痕 bundle.activate 实测 E-640 ✅ §2.3）+ BundleWizard 五要素向导 P7E5（slug/显示名/版本/变更日志/继承围栏/负责人 → 五槽骨架草稿，实测 E-641 ✅；草稿 0/6 待填充天然演示 p7_fail）+ p7_fail 状态变体（红条+失败槽位标红+修复清单）+ 空态草稿槽位待填充计数（§2.3）+ 权限态 readonly 无新建/激活入口（E2.6 隐藏非置灰，服务端 activate/createDraft 403 实测 ✅）；新增 packages/base/bundles 装配域（六插件之六「行业 Bundle 装载」落位）+ bundles/hotel/ui/cases.json ⑥槽实物（6 页 42 状态用例）+ bundlesRouter 四端点（status/recheck/activate/createDraft）；路由 /p7
- [x] F10 P6 装备库（PRD P6-①②③④⑤ 逐条对账）：AwarenessBanner 意识建议横幅（P6E1：主建议卡+「待确认 N 条」计数+其余紧凑行折叠；一键固化→触发器 F4.7 实测 trg-auto-room-price-price-adjust E-106 ✅、生成草稿→p6_create 预填、驳回降权 E8.3 实测阈值 3→6 上屏 ✅；确认前不产生自动化 L4.4；超时态 >10s「分析中」可关闭）+ SkillGrid 三级稀有度卡（§6 官方=金/团队=银/行业共享=铜；官方套件 P6E2 绑定围栏可见+「已装给谁」chips →/p8/agent/:id；行业共享已脱敏 ✓ 标记 L8.1）+ F8.5 使用看板（server 新增 skills.usage：绑定 Agent 事件投影——双形态匹配 skills ? 短名/全 id，调用次数/采纳率/驳回模式分布/低采纳提示优化下架；实测差评危机公关 10 次·100%、收益管理专家 20 次）+ SkillWizard 零代码向导 p6_create（三要素触发/步骤/边界+「不能做什么」自动转围栏声明提示+SKILL.md 实时预览+R1–R6 围栏勾选；确认创建→团队技能 v1 进版本管理 F8.3 实测 skill-t-深夜房价守护 v1.0.0 ✅ → dry-run 回放 10 条前置 F2.5 → 安装；完成后态新卡入团队技能区 ✅）+ 空态仅官方套件+新建入口（F8.1）+ 加载骨架 G10 + 错误态安装拒绝原因行内展示（L8.2/E8.2 实测行业技能白名单拦截留痕 E-101 ✅）+ 权限态社区版隐藏行业共享区（F7.2 隐藏非置灰）+ readonly 隐藏全部动作入口（E2.6）且服务端 install/uninstall/forge/awareness.confirm/reject 五写操作补 readonly 403 守卫（实测 MEM-003 安装被拒 ✅）；种子补团队技能「周一经营复盘」v1.2（已装）+ 行业共享「旺季满房冲刺包」（已脱敏待装）；路由 /p6、/p6/create
- [x] F9 P8 船员名册（PRD P8-①②③④⑤ 逐条对账）：人机混编 MemberGrid（P8E2 人类卡圆头像·角色口径经营者/集团 Teams/只读 + 权限摘要 F5.6 + 在线=近 24h 事件留痕推导不伪造 presence；P8E1 Agent 卡方头像+版本角标+LV/段位徽章+XpBar 战绩条（游戏化界面叙事，规则手册 §3 不设公式——XP=动作×2+积分确定性推导）+ 围栏绑定 tags + 技能包 + 30 天工时 L6.3 事件聚合投影（动作数/采纳率/积分·峰谷占比 G9）+ 夜班窗口 22:00–08:00 内 night_shift preset 青脉冲自动上线 M4 + 只读 preset 标绿 L9.1 + invalid 标红+原因 F2.10 错误态）+ 加装 preset P8E3 →P7（E2.6 非管理员隐藏）+ 档案态 p8_agent（身份与归属 Agent ID/版本 who.version 归因/工作区/来源 Bundle；航道许可围栏授权逐条对账 fence_rules active 版本、声明悬空标红 F2.10；技能包 join skills+installs →P6；运行约束+写回声明；30 天战绩四格；P8E4 发消息·派遣=threads.dispatch 复用（含糊反问不建单 F3.2 实测 ✅、明确派遣建 T-105 跳 P2 ✅；L3.7 三要素提示）；P8E5 最近事件流 who.id 过滤投影 12 条含回执位 E3.7，点击进线程 →P2 F1.12）；空态=仅官方 preset 引导（§2.2）；加载=骨架屏 G10；server 新增 roster router（list/profile，PRD P8-⑤ 数据来源逐条落地，全程 RLS set_config，越权返回空 L7.1）；顺手回填 devbox.sh REPO 路径 bug（cd /tmp 后相对路径失效）+ 技能包短名↔skill- 前缀 join 修复
- [x] F2 HUD 组件库 18 件（`apps/web/src/components/hud/`）：DispatchBar 航线设定台 / QuestCard（六态+重连）/ HandoffCard（空态禁显0）/ TriGestureBar（过期锁定 E5.3+权限隐藏 L5.1）/ FenceLight（四态+基线金锁）/ 消息族四件（回执三态徽标/子调用虚线/系统分隔线）/ KpiGauge（扫描线+截至时间+stale 置灰）/ RadarAlertCard（P0–P2+雷达扫动 4s+无异常态禁消失）/ NightStatusPill（四态）/ EmergencyBrake（二次确认）/ EmptyState / SkeletonBlock（1.4s 流光）/ BannerAlert 三级 / XpBar（斜纹流光 1.2s）/ LevelBadge / AchievementBadge / SquadRing / EquipSlot / EquipCard（金银铜稀有度）/ EventIdChip——动效令牌 sweep/xpflow/skflow 入 tokens.css 并登记降级；/dev 状态矩阵页逐格对账（§10 检查表），Bridge 顶栏改引库组件；无头截图三段走查 ✅ 双强调色分工无混用 ✅
- [x] F8 P5 航道管制台（PRD P5-①②③④⑤ 逐条对账）：版本历史（active/rolled_back/出厂基线 🔒 L2.1）+ 生效范围统计 + 规则列表 R1–R6（级别 pill 四色语义 + 基线金锁 F2.3 + 30 天触发数 rule_impact 聚合）+ NL 新增群规（Mock 转写草稿 D4 → 结构化预览 → dry-run 回放最近 10 条 F2.5 → 确认进变更审批 pending_approval F2.4；影响面过大拒绝拆条 E2.3；未确认不生效 L2.4）+ p5_readonly 只读视图（E2.6/L5.1）；server 新增 fence router（rules/versions/dryRun/confirmDryRun）；冒烟实测：R7 dry-run 回放 10 条挂起 4 → 确认 → pending_approval + fence.rule.propose 事件落库 ✅
- [x] F7 P4 决断队列（PRD P4-①②③④⑤ 逐条对账）：统一队列分级（高危→双人/越围栏 review→必审/其余→逐步审，F5.4/F5.1）+ 原生审批卡详情（diff 前删线后高亮 P4E1 + 命中规则随行 + 影响面 + 执行回执位说明 F1.1/E3.7）+ 三手势（驳回必填原因 L5.2；写回 approvals.decide + 记忆校准 F5.5/F1.7）+ p4_conflict 快照冲突红条+刷新再审（E5.3/F2.7，冲突项禁审）+ WhyPanel 决策链路（依据事件/引用记忆/模型档与积分，F1.12/L3.6）+ IM 卡片同步卡（幂等键/原地更新语义，L5.3/D7 本地回环）+ 批量采纳低风险（G6 二次确认接 batchApprove）+ p4_empty 清空+手势统计；权限态：只读隐藏手势 diff 只读（E2.6/L5.1）
- [x] F6 P3 掌上战报（移动端 375px 拇指化重排，PRD P3-①②③④⑤ 逐条对账）：三栏计数头与 P1 交接班卡同源强一致（F4.4，点击筛选）+ 审批卡逐条三手势（热区 ≥44px §4.2；驳回必填原因 L5.2；写回接 approvals.decide 权重 1/2/3 F5.3）+ expired 虚框卡（F5.7；高危无超时放行 L5.4 提示）+ 求援卡（夜间未执行任何动作 L4.2）+ 批量推进（仅低风险可批量 G6 二次确认，接 batchApprove 高危跳过）+ 紧急制动（P3E5 接 nightShift.pause）+ 完成后态「今日待审已清空」+手势统计（F5.5）；权限态：只读成员隐藏手势与双键（E2.6）；独立移动机身（44px 圆角+深空内容区 §4.2）
- [x] F5 P9 守夜战队频道（PRD P9-①②③④ 逐条对账）：班组消息流=夜班频道事件流投影（ts 升序；越围栏标「未生效·待审批」L4.1；需介入红框卡 L4.2 → 一键派单 P9E3）+ 一键暂停实接 pauseAll（二次确认在组件层；G5 计时回执卡；非法迁移 F4.8 干净 400）+ 恢复 resumeNight（E4.2 续跑）+ 班组留言=五元事件留痕（P9E6 实测 E-101 落库可检索）+ 右栏班组状态机/峰谷计量（off-peak 投影 G9）/围栏快照（F2.6 可回溯）/SquadRing 7 船员环+在线脉冲（P9E4）+ 交接班预告卡（P9E5）；权限态：只读成员隐藏留言栏与制动杆（E2.6/L3.4）；server nightShift 补 events/pause/resume/note 四端点；顶栏夜班胶囊点击必达 P9（§5.9 铁律）；新增 `scripts/devbox.sh`（沙箱重建一键恢复：Node24+PG17/pgvector 用户态解包+迁移种子+serve，接力环境纪律入库）
- [x] F4 P2 任务舱·主线执行（PRD P2-①②③④⑤ 逐条对账）：行动消息流=线程事件流子序列投影（session_id 查询，ts 升序；回执三态/命中规则/能量逐事件渲染，无回执标未核实 L3.6/E3.7）+ ThreadInspector 右栏（进度 XP 条/计量 model_trace 投影/围栏判定聚合/参与成员，≤5s 轮询+断线显重连不伪造进度 F3.4）+ 内联审批卡（diff+命中规则版本+三手势写回 approvals.decide，驳回必填原因 ≤200 字 L5.2；已决态渲染）+ p2_done 交付卡+决策链路时间轴（无对外变更明示「仅只读分析」E3.7）+ p2_error 三入口（转人工/降级重试接 threads.run replay 幂等/回滚标注 E1 接线位）+ 只读成员隐藏输入栏（E2.6）+ 追问沿用线程上下文（threads.run）；server 补 threads.get/threads.events；P1 线程点击跳 /p2/:id；hud 补 PlanCompareCard（F3.7 越围栏双人确认提示）；走查：T-101 完成态交付卡+20 事件时间轴 ✅ T-102 待审查态+舰长决断气泡 ✅
- [x] F3 P1 主甲板真实接线（PRD P1-①②③ 逐条对账）：左栏分组会话列表（📌守夜战队/昨夜战报 ✓9◆3▲2/待办审批 badge/线程状态点+进度）+ 中栏（交接班卡三计数与左栏强一致 F4.4 + KPI 四卡=一店一档 history_curve 真实投影 + 巡检雷达推送接 inspection.dispatch 一键派单 + 无异常「昨夜一切正常」）+ 右栏（档案 chips/守夜战队卡/人机混编在线成员 10/渠道巡检）+ 底部航线设定台受控输入（空文本禁点 §5.1/Enter 或启航建单）+ 快捷目标 6 条（F3.5）；状态变体 p1/p1_loading 骨架/p1_empty/p1_community（隐藏夜班+Quest 快捷目标，F7.2 隐藏非置灰）；轮询线程夜班 5s 其余 10s（F3.4/D6）；含糊反问不建任务实测 ✅（「搞一下」→clarify）、明确派遣建 T-104 ✅；server 补 workspace/nightShift 两薄 router + trpc 客户端 JWT 头（演示身份自动登录 MEM-001）；DispatchBar 升级受控组件 — `apps/web/src/pages/p1/P1.tsx` / `lib/trpc.ts` / server router；Bridge 支持 left/right 插槽
- [x] F1 tokens.css 全令牌 + 舰桥壳 + 顶栏（设计规范 §2/§3/§4/§7 逐项回引注释可查）：色板补齐星云晕染对/金底深棕/需介入紫、字号阶梯 Display→Micro、圆角/栏宽 236·264/间距、动效令牌 drift 90s·pulse 1.6s·2s·0.8s·sheen 2.6s（全部登记 prefers-reduced-motion 降级）；星野背景双层（公理Ⅰ 禁死黑）；HUD 四角刻度对齐原型 18px·2px·贴边；P1E5 夜班胶囊（999px+呼吸灯，含 paused 琥珀变体）+ P1E6 紧急制动杆（.brk 描边款）；Orbitron/JetBrains Mono 字体引入（§3）— `apps/web/src/styles/tokens.css` / `shell/Bridge.tsx` / `index.html`；走查：vite build ✅、无头截图双强调色分工无混用 ✅、vite dev 全链路 tRPC 握手 200 ✅

## 阶段四任务卡

- [x] E1 E2E 演示剧本（PRD PF 章六条流程实跑）— `pnpm demo`：一键重置（`reset.sh --yes` 整库重建+迁移+种子，生成「昨夜」数据）→ PF.1 晨间审批（交接班三栏 F4.4/批量采纳 G6/手势权重写回 F5.5）→ PF.2 一句话派遣（含糊反问不建任务 F3.2/建档 19ms ≤3s F3.1/Quest 3 步过围栏瀑布/G8 留痕 100%）→ PF.3 巡检派单（只读巡检 L9.1 真实检出 3 异常/高优聚合推送 G3/一键派单 F9.3+幂等 L9.3/回链 E9.3）→ PF.4 夜班闭环（候选清单 F4.1/人类命令开启+围栏快照 F2.6/一键暂停 3ms ≤60s G5/恢复 E4.2/决策包投递 F4.4/状态机 F4.8 全链）→ PF.5 围栏演进（dry-run 回放 10 条 F2.5/未确认不得激活 L2.4/提案进 P4 高危审批 F5.4/手势通过→activateRuleVersion 激活 F2.4）→ PF.6 技能沉淀（高频检测 ≥3 次/周 F8.4/一键固化触发器 F4.7/技能草稿 dry-run F8.3/安装即绑定 F8.2/使用看板回流 F8.5）；断言 44/44 全绿、`--no-reset` 复跑降级 42/42 全绿——产出 `scripts/demo.ts` + 服务端联调补线（nightShift.candidates/start/deliver 三端点 + confirmDryRun 提案进 P4 审批队列 + decide/batchApprove 手势通过→围栏激活接线，纯函数 `fenceRuleRowId`/`fenceActivationFromProposal` 入 fence-engine 带 3 条单测）+ 种子补巡检只读快照（archive.inspection：高危差评+中危价格/房态，schema 同步登记）—— commit `ea9a506`
- [x] E2 启动脚本四件套 + doctor.sh 一屏自检（D13②）：四件套复核定稿——`start.sh`（缺依赖友好提示/无 docker 回落本机 PG/幂等迁移种子/端口占用前置拒绝）·`stop.sh`（按端口优雅终止不误杀，`--pg` 可选停容器）·`reset.sh`（`--yes|-y` 非交互确认，供 demo/CI 调用）·`scripts/devbox.sh`（沙箱/无 Mac 一键重建）；**doctor.sh 重写**为分区一屏报告（运行时 node≥24+arch/pnpm/git/Xcode CLT｜工作目录 .env/node_modules/vendor 锁版｜模型 LLM_PROVIDER+Key 尾号打码｜凭据 JWT_SECRET 默认值告警+IM_DRIVER｜会话存储 PG 连通+版本 17+pgvector 扩展+_migrations 计数+H-1 五元完整率+组织计数+RLS 0 行实测+app 角色 INSERT 拒绝实测｜原生模块 pty.node 探测｜端口 5432/8787/5173），`FAIL` 计数 exit 0/1；沙箱实测 exit 0 全绿
- [x] E6 dsh headless 回归门禁（D13①，H-5 验收载体）：`scripts/dsh-gate.sh` 六步脚本化——`packages/runtime/dsh-gate/` 锁版依赖（dsh 0.1.0-rc.6 + node-pty onlyBuiltDependencies）→ headless profile 初始化 + `profile.cordis.patch.yml`（占位符模板：id 覆盖 agent-default-model 指向 workloom-mock + insert workloom-fence/workloom-audit 双插件）+ `settings.yaml`（llm-pi-ai.providers.workloom-mock → OpenAI 兼容 Mock `mock-openai.mjs`：/rules 围栏规则源 GATE-R1/R2 + SSE 流式 + DSH_SLOW_MS 慢速模式）→ **用例一**最小任务全链（headless → bash 工具调用 → 围栏瀑布判定日志 `judge tool=…level=…` → workloom-audit 事件桥落账 37 条 → 哈希链逐条重算通过）→ **用例二 H-5**：DSH_SLOW_MS=1500 慢速 Mock + headless 后台跑 + 推理流中途 `kill -9`（断言 run2.log **无** TASK_COMPLETE，确为崩溃现场非事后补刀）→ 审计链 25 条完整 + `verify-audit.mjs --replay` 递归遍历会话目录（含 `.jsonl.zstd` zstd 解压）重放 6 条会话事件 → 首投 6 · 重投新增 0 幂等零重复；workloom-audit 事件桥原型（session/event 监听 + canonical 序列化 + prev_hash 链 + 挂载时崩溃恢复跳过尾部半行 + JSON 往返净化消 undefined/Date 运行时差异）；踩坑回填：① 用例二必须**先杀快速 Mock 再占同端口起慢速 Mock**，否则 headless 抢在 kill 前跑完、崩溃现场造假；② dsh 会话为嵌套目录 `session.jsonl.zstd`，扁平 readdir 会重放出 0 条假绿——已改递归 walker 且 0 事件即失败
- [x] E3 README + docs 四件套收尾：README 重写为「从零 ≤半天」口径——macOS 前置条件表（Node24/pnpm10/PG17+pgvector docker 优先或 brew/Xcode CLT 仅 node-pty 需要）+ 四件套用法表与 doctor 输出分级解读（✅/⚠️/❌）+ LLM 可选配置（默认 mock 离线全通，真实 Key 用户侧自配永不入库 D4）+ IM 通道 mock/真实双口径（install-im-channels.sh → dsh 设置页配凭据）+ `pnpm demo` 与 `bash scripts/dsh-gate.sh` 入口 + devbox.sh 沙箱重建 + 目录结构同步（base 九域/runtime 双件/vendor 双锁版）；RELAY.md 新增 §5 提交与推送实测口径（git 协议强制 HTTP/1.1 规避 GnuTLS -110；REST 兜底带重试，间歇 404 与 /git/commits 恒 404 已登记）
- [x] E5 tag `v1.0.0` + PROGRESS 归档：打 tag 前置全量回归单轮全绿（typecheck 6 包 / 测试 157=shared4+base144+runtime9 / web build 3.33s / demo 44/44 / doctor exit 0 / dsh-gate 用例一 37 条验链+用例二 H-5 崩溃现场 25 条验链+重放零重复）；阶段四收官——仓库完整、可克隆、可运行（README 从零 ≤半天路径 + devbox.sh 沙箱重建 + 四件套 + 双门禁脚本化）

## 最后游标

- **E5 已收官（2026-08-17）**：tag `v1.0.0` 打出，阶段四归档完成（见实测记录 E5 批次）。
- **下一步**：**阶段五 W1 官网落地页**（D15；事实源=D15 登记的章节结构——用户供稿 HTML 原件未入库，按 D15 结构重建；星盟战舰 tokens 同源；移动端 375 可读；**诚实性约束：Release 无产物前下载按钮挂「即将开放」态**）。随后 W2 Mac 打包+GitHub Release 极简安装管线。
- **E3 已收官（2026-08-17）**：README 重写+RELAY §5 推送口径入库。commit `3a261c4`。
- **E2+E6 已收官（2026-08-17）**：启动脚本四件套复核+doctor.sh 一屏自检全绿；dsh headless 回归门禁（含 H-5 kill -9 崩溃重放）真实崩溃现场全绿（见实测记录 E2+E6 批次）。commit `2b962df`。
- **E1 已收官（2026-08-17）**：E2E 演示剧本六条流程沙箱实跑全绿（见实测记录 E1 批次）；Mac 实跑属 E2/E3 排期（用户无 Mac 环境，沙箱实测为准）。
- **阶段二已收官**：附录 H 可自动化条款（1/2/3/4/5/7/9/10/14）全部有对应测试/验收且通过；B10 验收 L9.2（巡检失败必出事件）/ L8.3（卸载即撤销）已转测试锁定。tag `v0.2.0`。
- **F9 已收官（2026-08-17）**：P8 船员名册双态（p8/p8_agent）真实接线，门禁全绿（见实测记录 F9 批次）。
- **B11 已收官（2026-08-17，用户显式插单）**：dsh-im 评估结论=采纳（D14），IM 通道域代码整合完成并门禁全绿（见实测记录 B11 批次）；真实通道凭据由用户在 dsh 设置页自配（IM_DRIVER 默认 mock）。
- **F10 已收官（2026-08-17）**：P6 装备库双态（p6/p6_create）真实接线，门禁全绿（见实测记录 F10 批次）；顺手回填 skills 五写操作 readonly 服务端 403 守卫。
- **F12 已收官（2026-08-17）**：阶段三全局收尾完成——25 屏走查（`docs/WALKTHROUGH-v0.3.0.md`）+ 社区版切换演示 + 附录 H 13/15 测试锁定（H-5/H-12 排期阶段四），tag `v0.3.0`。
- **F11 已收官（2026-08-17）**：P7 舰船换装坞（p7/p7_fail）真实接线，门禁全绿（见实测记录 F11 批次）；base 新增 bundles 装配域，L2 六插件全部落位。
- **D15 已立项（2026-08-17，官网与分发）**：用户供稿官网单页素材并入计划——新增阶段五「官网与分发」（W1 官网落地页 / W2 Mac 打包+GitHub Release 分发管线，MASTERPLAN §4），排期=阶段三/四完成后；诚实性约束：Release 产物落地前下载按钮挂「即将开放」态。详见 DECISIONS D15。
- 环境重建：沙箱 /tmp 回收后 `bash scripts/devbox.sh`（+`serve`）一条命令恢复全环境；`pnpm demo` 需 server 在线（devbox.sh serve 或 pnpm dev），沙箱内 psql 路径由 devbox 提供（Mac 上 brew/docker 自带）。
- 外部真实接口纪律（用户 2026-08-17 明确）：LLM 等外部 API 一律走 Mock Provider/OpenAI 兼容网关跑通测试（D4），用户安装后自行在 .env 接入真实 Key（LLM_PROVIDER/LLM_API_KEY）。
- 集成测试纪律：DB 用例对同一数据库可重跑（B10 起全部用例带唯一后缀隔离；B3 memory 测试已顺手修同源污染）；回归前推荐 `./scripts/reset.sh` 整库重建后单轮全绿为准。
- **D13 已立项（2026-08-17，dsh 社区生态评估）**：① 阶段四新增 E6「dsh headless 回归门禁」（`dsh --profile headless` 脚本化用例 + H-5 kill -9 重放验收载体）；② E2 扩为含 doctor.sh 一屏自检（对齐 dsh-TUI `/doctor` 清单）；③ DSH Desktop 式桌面安装包进停车场（触发条件=私有化/一键分发需求）。详见 DECISIONS D13 / MASTERPLAN 阶段四与 §7。社区项目实证不改 Harness 内核、纯消费文档化 seam 的路线（DSH Desktop ≈8.5k★ / dsh-TUI ≈1.5k★），D12 双轨纪律不变。

## 实测记录（2026-08-17 · Linux 沙箱，Node 24.19 / pnpm 10.14 / PG 17.11 + pgvector 0.8.6）

**E5 批次（本批，同环境实测）**：

| 门禁 | 结果 |
|---|---|
| `pnpm -r --if-present typecheck` | ✅ 6 包零错误 |
| `pnpm -r --if-present test`（RUN_DB_TESTS=1 双角色） | ✅ 157/157（shared 4 / base 144 / runtime 9） |
| `pnpm -C apps/web build` | ✅ 3.33s（407KB） |
| `pnpm demo` | ✅ 44/44 全绿 |
| `bash scripts/doctor.sh` | ✅ exit 0 |
| `bash scripts/dsh-gate.sh` | ✅ 用例一 37 条验链 + 用例二 H-5 崩溃现场（kill -9 于推理流中途，run2 无 TASK_COMPLETE）25 条验链 + 会话重放零重复 |

**E2+E6 批次（本批，同环境实测）**：

| 门禁 | 结果 |
|---|---|
| `bash scripts/doctor.sh` | ✅ exit 0：运行时/工作目录/模型/凭据/会话存储（PG 连通+pgvector+迁移计数+H-1 100%+RLS 0 行+app 角色 INSERT 拒绝实测）/pty.node/端口 全分区通过，⚠️ 仅建议项 |
| `bash scripts/dsh-gate.sh` 用例一 | ✅ headless 最小任务全链：bash 工具调用经围栏瀑布（judge 日志 level=auto）→ 最终答案 TASK_COMPLETE → workloom-audit 落账 37 条，sha256 逐条重算+prev 链接全过 |
| `bash scripts/dsh-gate.sh` 用例二（H-5） | ✅ 慢速 Mock 推理流中途 `kill -9`（run2.log 断言无 TASK_COMPLETE，真实崩溃现场）→ 审计链 25 条完整 → 会话事件递归重放（含 zstd）6 条：首投 6 · 重投新增 0 幂等 |
| `pnpm -r --if-present typecheck` | ✅ 6 包零错误 |
| `pnpm -r --if-present test`（RUN_DB_TESTS=1 双角色） | ✅ 157/157 全绿（shared 4 / base 144 / runtime 9，本批无服务层 TS 改动） |
| `pnpm -C apps/web build` | ✅ 2.89s（407KB） |
| `pnpm demo`（全量重置复跑） | ✅ 44/44 全绿（E2/E6 改动未影响六流程） |

**E1 批次（本批，同环境实测）**：

| 门禁 | 结果 |
|---|---|
| `pnpm -r --if-present typecheck` | ✅ 6 包零错误（server 路由补线 + fence-engine 接线纯函数 + demo.ts） |
| `pnpm -r --if-present test`（RUN_DB_TESTS=1 双角色） | ✅ 157/157 全绿（base 144：新增 fenceActivationFromProposal/fenceRuleRowId 3 条；shared 4 / runtime 9） |
| `pnpm -C apps/web build` | ✅ 3.01s（407KB，AppRouter 类型源同步通过） |
| `pnpm demo`（默认：一键重置+六流程） | ✅ 断言 44/44 全绿：PF.1 交接班 ✓9◆3▲2+批量采纳 1 条+手势权重写回；PF.2 含糊反问+T-104 建档 19ms（≤3s F3.1）+Quest 3/3 completed+留痕 4 条五元齐备；PF.3 巡检 9 检项检出 3 异常（高危差评+中危价格/房态）+聚合推送 1 条+派单 T-105+重复派单 deduped+回链 E-112；PF.4 候选 3 项+开启 nr-2026-08-17+围栏快照 v1+暂停 3ms withinSla（G5）+恢复+决策包 ✓4◆0▲0+状态机全链；PF.5 R7 dry-run 回放 10 条+L2.4 未确认不生效+提案 apr-e-118 进 P4 高危+采纳 E-119→R7 v-next active；PF.6 高频建议 7 条（price.adjust×21 等）+固化触发器 trg-auto-room-price-price-adjust E-121+技能草稿 dry-run+安装+看板 6 投影 |
| `pnpm demo --no-reset`（复跑降级） | ✅ 42/42 全绿：已派单/已固化按 L9.3/L4.4 幂等跳过，夜班顺移次日班次（nr-2026-08-18），R7 已激活降级提示不谎报 |

**F12 批次（本批，同环境实测）**：

| 门禁 | 结果 |
|---|---|
| `pnpm -r --if-present typecheck` | ✅ 6 包零错误（新增 PlanSwitcher/auth.setPlan/security-audit） |
| `pnpm -r --if-present test`（RUN_DB_TESTS=1 双角色） | ✅ 154/154 全绿（base 141：新增 security-audit 3 条 H-11/H-13/E1.3 + bundles H-15；shared 4 / runtime 9） |
| `pnpm -C apps/web build` | ✅ 2.80s（407KB） |
| 社区版切换冒烟 | ✅ owner→community 200（留痕 plan.switch）；community 下 dispatch 403+升级提示（H-10）；readonly setPlan 403；回切 pro 200 |
| H-6 一键暂停计时 | ✅ nightShift.pause 服务端 elapsedMs=6 · withinSla=true（上限 60s，G5）；p9_paused 截图后 resume 还原 |
| 25 屏走查 | ✅ 17 张实机截图（p1/p1_community/p2 三态/p9 双态/p3/p4/p5 双态/p8 双态/p6 双态/p7 双态）+ 8 瞬态代码/测试锚点，全绿入 `docs/WALKTHROUGH-v0.3.0.md` |

**F11 批次（本批，同环境实测）**：

| 门禁 | 结果 |
|---|---|
| `pnpm -r --if-present typecheck` | ✅ 6 包全绿（新增 base/bundles 装配域 + bundlesRouter + P7 页面） |
| `pnpm -r --if-present test`（RUN_DB_TESTS=1 双角色） | ✅ 150/150 全绿（base 137 含新增 bundles 8 条：骨架/slug 幂等/草稿保护/注册表/hotel 6 槽五项全绿/留痕/激活幂等/草稿拒活） |
| `pnpm -C apps/web build` | ✅ 2.79s（405KB） |
| tRPC 冒烟七步 | ✅ status hotel 6/6·7 preset；recheck 留痕 E-639；activate 幂等 E-640；createDraft 草稿 E-641；草稿激活 412 PRECONDITION_FAILED 带五项失败清单（F2.10 不静默）；MEM-003 activate/createDraft 双 403（E2.6）；readonly status 只读可见 200 |
| 无头截图走查 | ✅ p7 默认态（六槽全绿+检查单五绿+班组 7 卡）；p7_fail（草稿选中：红条拒绝激活+失败槽位标红+修复清单回链+激活钮禁用）；readonly 态（无新建/激活入口，隐藏非置灰） |

**F10 批次（本批，同环境实测）**：

| 门禁 | 结果 |
|---|---|
| `pnpm -r --if-present typecheck` | ✅ 6 包全绿（含新增 skills.usage 端点 + P6 页面） |
| `pnpm -C packages/base test`（RUN_DB_TESTS=1 双角色） | ✅ 129/129 全绿（本卡无 base 改动；种子新增 2 技能幂等 ON CONFLICT） |
| `pnpm db:migrate && pnpm db:seed` | ✅ 整库重建后复跑幂等（H-1 完整率 100%；团队/行业技能入库） |
| skills.usage 冒烟 | ✅ 差评危机公关 23 调用·采纳率 80%（4/(4+1)）·驳回模式 amount_too_large×1；收益管理专家 31 调用；绑定 Agent 归因正确 |
| 权限守卫 | ✅ MEM-003（readonly）调 skills.install → 403（E2.6 服务端强制）；五写操作同口径 |
| 意识闭环冒烟 | ✅ 固化 price.adjust → 触发器 trg-auto-room-price-price-adjust + E-106，同类不再建议；驳回 review.reply → 阈值 ×2（次轮 ≥6 上屏「阈值已经驳回校准」） |
| 向导闭环走查 | ✅ 无头浏览器：三要素填表 → SKILL.md 实时预览 → 创建 skill-t-深夜房价守护 v1.0.0 → dry-run → 安装 → 团队技能区新卡「✓ 已装备」 |
| 错误态走查 | ✅ 行业技能「装备到船员」→ 行内红条「不在签名白名单（L8.2），已拦截并留痕 E-101」 |
| web 构建 + 截图走查 | ✅ `vite build` 2.94s 绿；无头截图四段：p6 默认（横幅/三区稀有度卡/使用看板）✅ p6_create 向导（三要素+预览+围栏勾选）✅ 完成后态（新团队卡）✅ readonly 权限态（动作全隐藏）✅；双强调色分工无混用 |

**B11 批次（2026-08-17，同环境实测）**：

| 门禁 | 结果 |
|---|---|
| `pnpm -r --if-present typecheck` | ✅ 6 包全绿（含新增 im-channels 四件 + server im router） |
| `pnpm -C packages/shared test` | ✅ 4 绿 |
| `pnpm -C packages/base test`（RUN_DB_TESTS=1 双角色） | ✅ 129/129 全绿（含 im-channels 12 条：注册表↔DDL 对账/未启用通道拒绝/入站校验四拒/卡片组装/Mock 驱动 + PG 集成入站落库·幂等·PII 脱敏·openid 映射·手势闭环·readonly 403·卡片留痕）；踩坑回填：首轮往种子工作区 INSERT 测试成员并发污染 tenancy「3 成员」断言 → 改 UPDATE 绑定种子成员 openid（不增行，与 approvals.test.ts 同惯例）+ 清残留后两轮连跑全绿 |
| `pnpm db:migrate && pnpm db:seed` | ✅ 复跑幂等（H-1 完整率 100%，L1.4 冲突丢弃） |
| server 冒烟 | ✅ `/health` + `/trpc/system.health` 200（db:up）；im.channels 返回 5 通道注册表（slack=planned） |
| im 端到端冒烟（mock 驱动） | ✅ 入站 dingtalk→E-309 落库·同 channelMsgId 重推 deduped=true 返回原事件 ✅；sendApprovalCard apr-e-8895（R4:review）→ mock-dingtalk-1 + approval.card.sent E-410 留痕 ✅；callback approve→approved·回执「已采纳（操作人 王店长）」✅；重复回调 deduped·回执「已处理过（L5.3 幂等）」✅；未映射 openid 回调 → 403 E5.2 ✅；im.outbox 检视 3 条出站记录 ✅ |
| web 构建 | ✅ `vite build` 4.62s 绿（AppRouter 类型源同步通过） |
| dsh-im 真实挂载实证 | ✅ registry integrity 逐字符一致；`dsh plugin --profile web add @xmanrui/dsh-im@0.2.2` → profile 依赖挂载 ✅；`dsh web` 启动 200 且 index 注入 dsh-im/client.js 插件入口 ✅（凭据配置与真实通道收发属用户侧操作，不入沙箱门禁） |

**F9 批次（2026-08-17，同环境实测）**：

| 门禁 | 结果 |
|---|---|
| `pnpm -r --if-present typecheck` | ✅ 6 包全绿（shared/db/base/runtime/server/web） |
| `pnpm test`（含 PG 集成） | ✅ shared 4 + base 117 + runtime 9 = 130 全绿（本卡无新增服务层逻辑，roster 为 tRPC 投影层） |
| `pnpm db:migrate && pnpm db:seed` | ✅ devbox.sh 一条命令重建（H-1 完整率 100%）；顺手修复 devbox.sh 自身 REPO 路径 bug |
| roster.list 冒烟 | ✅ MEM-001 登录：人类 ×3（王店长在线=近24h留痕推导/李前台离线）+ Agent ×7 带 30 天聚合（调价 34 动作/23 币·峰谷 65%；评价 21 动作/采纳率 75%=3采纳÷(3+1驳回)） |
| roster.profile 冒烟 | ✅ agt-pricing-agent：R1 auto🔒/R2 block🔒 已声明对账 active 版本；revenue-manager 技能包（短名↔skill- 前缀 join 已修）；事件流 12 条含回执位 |
| 越权/只读 | ✅ MEM-003（readonly）调 roster 正常返回（L7.1 同工作区可读）；前端权限态隐藏「加装/派遣」入口（E2.6 截图走查 ✅） |
| P8E4 派遣闭环 | ✅ 无头浏览器实测：「搞一下」→ 意图含糊反问横幅不建单（F3.2）；「周五旺季调价…」→ 建 T-105 跳 /p2/T-105 |
| web 构建 + 截图走查 | ✅ `vite build` 绿；无头截图三段走查：p8 默认（人机混编/工时/夜班口径）✅ p8_agent 档案（身份/围栏/技能/战绩/事件流）✅ p8 只读权限态 ✅；双强调色分工无混用 |

**B10 批次（2026-08-16）**：

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
