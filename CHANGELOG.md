# Changelog

本文件记录 WorkLoom IM 底座的变更历史。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/)。

## [0.1.2] - 2026-08-20 · 审计修复批次（首轮独立审计，详见 docs/AUDIT.md）

### 安全修复

- **#22 RLS 事务级上下文失效（P0）**：#2/#20 把 `set_config(...,false)` 改事务级 `true`，但 15 个文件 40+ 封装无显式事务，autocommit 下设置语句结束即失效 → RLS 恒 NULL → 登录/审批/夜班/巡检/技能/召回 fail-closed 全不可用（此前 DB 集成测试全部 skip 未暴露，实测 37/144 红）。统一改为 BEGIN→set_config→fn→COMMIT/ROLLBACK；decide() 重构消除事务嵌套；测试断言池直查统一事务封装（原断言恒 0 行假绿/假红）。
- **#23 team 技能跨工作区互覆盖（P1）**：skills 全局表无 RLS，teamSkillId 仅名称派生，同名技能 ON CONFLICT 互覆盖。ID 内嵌 workspaceId（`skill-t-<ws>-<slug>`）；listSkills 按 scope 隔离；installSkill 追加本工作区归属校验（他区按 NOT_SIGNED 拦截留痕）。

### 功能正确性修复

- **#24 技能围栏绑定运行时不生效（P1）**：resolveAgentFenceBindings 无消费点，装配只读 preset 声明。assemblePreset 同事务并入 skill_installs 安装时快照（安装即生效、卸载即收缩）。
- **#26 appendEvent 幂等丢弃返回错误 hash/seq**：#4 只修了 appendEventIdempotent，主路径同根残留；去重时同事务回读 DB 真实值。
- **#27 routeIntent 超时未取消 LLM 调用**：classify 签名无 signal，AbortController 只赢 race；signal 接线到分类器（#7 名不副实补正）。
- **#28 冲突审批 approval_id 同毫秒碰撞**：makeReadableId("AP", Date.now()%100000) 熵不足，改事件派生 apr-e-\<eventId\>（同 loop.ts 口径）。
- **#29 IM 入站并发重推双写（TOCTOU）**：查重与写事件非原子；新增 im_inbound_dedupe 幂等键表（0003 迁移）原子占位，事件写失败补偿删占位。
- **顺带**：withObjectLock 的 SET LOCAL statement_timeout 挪到 BEGIN 后（事务外无效果，锁等待无超时兜底）；dispatch 并发上限检查移入事务（原池直查 fail-open 恒 0 行）。

### 测试健壮性

- **#25 runtime 全流程测试 flaky（~27% 失败率）**：静态 import 使 TOOL_UNVERIFIED_RATE=0 设置被击穿（模块级常量提前定型）；loop.js 改动态 import。H-15 测试 hotel 资产路径改 import.meta.url 定位（原 cwd 敏感）+ finally 还原 industry（防污染残留）。
- security-audit 增 #22 回归用例（autocommit 反例 fail-closed + 池连接卫生）。

### 数据库迁移

- 新增 `packages/db/migrations/0003_im_inbound_dedupe.sql`：`im_inbound_dedupe` 幂等键表（PK(workspace_id,channel,channel_msg_id)，RLS 同口径）。

### 门禁验证

- ✅ typecheck 全绿（6 个项目）
- ✅ shared 4/4 · **base 148/148（含 54 个原 skip 的 DB 集成测试，×3 连跑）** · runtime 11/11（×5 连跑）
- ✅ 安全门禁 6/6（append-only 双保险 / 旁路直写防控 / RLS 隔离）· seed 幂等复跑
- ✅ server `/health` + `/trpc/system.health` 200（db:up）· web build 绿 · 端到端 loginAs→members/threads/approvals 实测通过

## [0.1.1] - 2026-08-20 · Bug 修复批次

### 安全修复

- **#9 提示词注入防护**：`routeIntent` 的 LLM 分类器 prompt 用 `<user_input>` 结构化分隔符隔离用户输入，声明分隔符内为数据非指令，防止用户输入劫持分类结果绕过审批路由（F3.2）。
- **#2/#20/N RLS 配置统一**：全部非测试代码的 `set_config('app.workspace_id', ..., false)` 改为 `true`（事务级），消除会话级 RLS 变量泄漏到连接池的跨租户数据泄漏风险（F7.1/L7.1）。
- **#17 技能 fence_bindings 安装时快照**：`skill_installs` 表新增 `fence_bindings_snapshot` 列，安装时快照绑定；运行时 `resolveAgentFenceBindings` 读快照而非 `skills.fence_bindings` 实时值，防止技能作者更新绑定绕过 E8.1 冲突检测。
- **#16 isSignedSource DB 约束**：`skills` 表新增 CHECK 约束 `skills_team_id_format`，强制 `level='team'` 的技能 ID 必须以 `skill-t-` 开头，与 `isSignedSource` 逻辑一致，DB 层防伪造签名。

### 数据一致性修复

- **#10 expireSweep 写事件**：过期审批状态变更现在经网关写 `approval.expired` 事件，不再只改表不写事件，符合铁律 1（一切写入必经网关，F5.7/E5.3）。
- **#11 runQuest 重放跳过被阻塞步骤**：`existingStepIds` 只收录真正执行完成（auto）的步骤，排除 block/review 事件（按 `basis` 前缀「熔断：」「越围栏挂起：」识别），避免重放时跳过从未执行的步骤（E3.3/H-5）。
- **#4 appendEventIdempotent 去重返回正确 hash**：去重时从 DB 取回已存在事件的真实 `hash`/`seq` 返回，避免调用方拿到错误 hash 断链（L1.4）。

### 功能正确性修复

- **#12 模型路由熔断不丢弃回答**：熔断时 `RouteResult` 新增 `budgetExceeded` 标志并仍返回 `text`，避免白烧 token（F6.5/L6.4）。
- **#13 resumeNight 区分夜班暂停与手动暂停**：`threads` 表新增 `paused_by` 列；`pauseAll` 标记 `paused_by='night-shift'`；`resumeNight` 只恢复该标记的线程，不覆盖用户手动暂停（F4.3/E4.2）。
- **#5 isWriteAction 与围栏规则同步**：网关新增 `registerWriteActions` 运行时注册接口，行业 Bundle 新增写类动作后可注册到网关，避免硬编码前缀未覆盖而放行未声明 fence_bindings 的 Agent 写动作（F2.10）。
- **#6 confirmNight 围栏快照严谨化**：围栏版本快照查询限定 `is_baseline=true` + `ORDER BY version DESC` 确定性排序，避免取到非基线规则或随机版本（F2.6）。
- **#19 currentWindow 支持非跨午夜窗口**：峰谷窗口判定支持跨午夜（`start > end`，如 22:00-08:00）和非跨午夜（`start < end`，如 09:00-17:00）两种配置（F6.3）。
- **#21 回执失败不传播**：`handleGestureCallback` 的 `driver.sendText` 失败时只记录日志，不让成功的审批操作「看起来失败」（F5.5）。
- **#18 P1 dispatchState 卡 typing**：`dispatch` 的 `finally` 块用 `text.trim()` 判断而非闭包旧值 `draft`，避免成功派遣后 DispatchBar 卡在 typing 态。

### 设计改进

- **#8 PII 银行卡加 Luhn 校验**：`BANKCARD` 规则新增 `verify` 二次校验，用 Luhn 算法过滤订单号/时间戳等非卡数字，避免误脱敏破坏业务语义（F1.10）。
- **#7 routeIntent 超时取消 LLM 调用**：超时后调用 `AbortController.abort()` 真正取消底层 LLM 请求，避免 token 浪费（F3.2）。
- **#14/#15 withObjectLock 改用阻塞锁 + 64位 key**：改用 `pg_advisory_xact_lock`（阻塞版，内核管理等待队列）+ md5 前 16 位转 bigint 的 64 位 hash key，避免轮询占用 gateway 连接 5 秒和 `hashtext` 32 位碰撞（E2.5）。

### 架构优化

- **K mock 工具随机返回 synced:false**：demo 工具通过 `TOOL_UNVERIFIED_RATE` 环境变量控制（默认 10%）随机返回 `synced:false`，让 E3.7 回执校验路径在开发阶段就被走到。
- **L 连接池扩容**：`app` 池 10→30，`gateway` 池 4→20，`owner` 池 2→5，避免并发请求耗尽连接。

### 数据库迁移

- 新增 `packages/db/migrations/0002_bugfix.sql`：
  - `threads` 表新增 `paused_by` 列 + 索引（#13）
  - `skill_installs` 表新增 `fence_bindings_snapshot` 列（#17）
  - `skills` 表新增 CHECK 约束 `skills_team_id_format`（#16）

### 门禁验证

- ✅ typecheck 全绿（13 个项目）
- ✅ shared 包测试 4/4 绿
- ✅ base 包测试 90 passed（54 skipped 为 DB 集成测试）
- ✅ runtime 包测试 5 passed（4 skipped 为 DB 集成测试）

### 未纳入本批次

- **#1/A 双池事务一致性（Outbox 方案）**：架构性大改造，影响面贯穿全栈，需单独评估，留待下个版本。
