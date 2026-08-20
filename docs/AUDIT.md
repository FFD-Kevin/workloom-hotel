# AUDIT.md · WorkLoom IM 底座审计与优化记录

> 本文件为审计历史事实源（追加不改旧）。每轮记录：范围 / 方法 / 问题分级 / 根因 / 方案 / commit / 回归证据。
> 分级口径：P0 阻断/安全漏洞 · P1 严重 bug/设计缺陷 · P2 一般缺陷/可维护性 · P3 优化建议。

---

## dsh 升级登记 · 2026-08-20（rc.6 → rc.8，commit 9b7a8d0）

- **触发**：官方 rc.7（08-17）/ rc.8（08-19）发布；项目所有者当日新决策——**任何新版本（含 rc/beta/alpha）即升，不得等稳定版**（取代 VENDOR.md 原「稳定 1.x 才升级」旧口径，决策已同步回填 VENDOR.md 与审计技能）。
- **升级内容**：vendor/dsh → rc.8（integrity 与 registry 逐字符一致 ✅）；dsh-gate pin rc.8 + lock 更新 + node-pty rebuild。
- **rc.8 变更面**：CLI 聚合包 lib 字节与 rc.6 一致；subagent Codex / Claude Code 改为按需安装 Profile Bundle；SQLite 新存储格式不向下兼容（沙箱 DSH_HOME 新建，无历史会话，无迁移负担）。
- **兼容性实测**：E6 dsh-gate 门禁全绿（workloom-fence 挂 tools/pre-execute 正常、事件桥 37 条验链通过、H-5 kill -9 重放零重复），plugins 薄壳适配器零改动。
- **subagent 插件已装**（DSH_HOME web profile）：`@deepseek-ai/dsh-subagent-claude-code@0.1.0-rc.8` + `@deepseek-ai/dsh-subagent-codex@0.1.0-rc.8`，`--dump-config` 确认两插件加载正常；实际调度需目标机安装 codex / claude-code CLI 本体与凭据（沙箱不验证真实调用）。

---

## 第 1 轮 · 2026-08-20（基线 a596e2a → c595348）

### 范围与方法
- 全量代码走查：安全网关 / append-only / 围栏引擎 / 权限 / RLS / 多租户 / IM 通道 / 夜班 / 巡检 / 技能体系 / runtime / tRPC 路由。
- 沙箱自建 Node 24.9 + PostgreSQL 17.11 + pgvector 0.8.6 实测：迁移 + 种子 + **开启此前全部 skip 的 DB 集成测试**（RUN_DB_TESTS=1）。
- dsh 版本检查：官方仓库 deepseek-ai/deepseek-harness 已发布 **rc.7（2026-08-17）/ rc.8（2026-08-19）**，npm latest=rc.7、next=rc.8；diff rc.6→rc.8：CLI `lib/*.js` 字节一致，仅 agent-presets 配置与 package.json 依赖 bump。**按 vendor/dsh/VENDOR.md 纪律「稳定 1.x 发布后才升级」，保持 rc.6 锁定不升级**，本登记备查。

### 已修复（逐点增量提交）

| 编号 | 级别 | 问题 | 根因 | commit |
|---|---|---|---|---|
| #22 | **P0** | 全量读路径 fail-closed 失效（登录/审批/夜班/巡检/技能/召回不可用；RUN_DB_TESTS=1 实测 37/144 红） | #2/#20 把 `set_config(...,false)` 改事务级 `true`，但 15 个文件 40+ 封装（connect→set_config→fn→release）无显式事务，autocommit 下事务级设置语句结束即失效 → RLS 上下文恒 NULL | `cb4f154` |
| #23 | **P1** | team 技能跨工作区互覆盖 + 列表跨区可见 + 他区可装 | skills 全局表无 RLS，teamSkillId 仅名称派生，ON CONFLICT DO UPDATE 互覆盖 | `4383ef6` |
| #24 | **P1** | 技能「安装即绑定围栏」运行时不生效 | resolveAgentFenceBindings 定义后无消费点，assembly 只读 agents.fence_bindings | `04aa1e1` |
| #25 | P2 | runtime 全流程测试 ~27% 概率失败（flaky）；H-15 测试 cwd 敏感 | demo 工具 10% 随机 synced:false；测试静态 import 使 env 设置失效；process.cwd() 相对路径 | `630d24b` `c595348` |
| #26 | P2 | appendEvent 幂等丢弃返回错误 hash/seq | #4 只修了 appendEventIdempotent，主路径同根残留 | `0c1f4f3` |
| #27 | P2 | routeIntent 超时未真正取消 LLM 调用 | AbortController 只赢 race，classify() 无 signal 参数（#7 名不副实） | `f2332ea` |
| #28 | P2 | 冲突审批 approval_id 同毫秒碰撞 | makeReadableId("AP", Date.now()%100000) 熵不足，改事件派生 apr-e-\<id\> | `e4796a3` |
| #29 | P2 | IM 入站并发重推可双写事件 | 查重与写事件非原子（TOCTOU）；改 im_inbound_dedupe 幂等键表原子占位（0003 迁移） | `c7eb8cf` |
| 顺带 | P2 | withObjectLock 锁等待无超时兜底 | SET LOCAL statement_timeout 在 BEGIN 之前（事务外无效果），已挪正（随 #22 commit） | `cb4f154` |
| 顺带 | P2 | dispatch 并发上限检查 fail-open 恒 0 行 | threads 计数走池直查无 RLS 上下文，已移入事务（随 #22 commit） | `cb4f154` |
| 顺带 | P2 | H-15 测试污染种子 industry（断言中断残留 copycat） | 还原逻辑不在 finally；另测试断言池直查在 RLS 下恒 0 行（假绿/假红） | `cb4f154` |

### 登记不修（P3，下轮评估）
1. **fence_rules RLS WITH CHECK 允许写 `workspace_id='*'`**：任何 workspace 上下文可插/改全局基线行（服务层有审批流兜底，DB 层未强制；建议 DB 层拒 `*` 写入或改 owner 通道）。
2. **哈希链粒度不一致**：advisory 锁为 tenant 级，但 RLS 把链尾读取限到 workspace → tenant 视角链分叉。当前验证口径（dsh jsonl）不受影响；如需 tenant 单链属方案级变更，走 ADR。
3. **biz_events 缺 TRUNCATE 触发器**：表 owner 可清空事件库（行级触发器不拦 TRUNCATE）。
4. **JWT 无吊销 + verifyToken 缺字段校验弱**：成员被移出后旧 token 24h 内有效（演示口径，生产 IdP 对接时解决）。
5. **PII 占位符无盐 sha256(8)**：低熵数据（手机号）可枚举反查（需 DB 读权限为前提，风险可控）。
6. **uninstallSkill 事件 revokedBindings 读实时值**：运行时收缩按快照正确，仅留痕数值可能不准。
7. **appendEvent created_at 取客户端 payload.context.time**：事件时间可被声明方伪造（建议 DB 默认 now() 与服务端时间分离）。
8. **#1/A 双池事务一致性（Outbox）**：沿用 0.1.1 既有登记，架构性改造另评。

### 门禁清单结果（全部实测通过）
- typecheck 全包绿（6 项目）；shared 4/4；**base 148/148（含 54 个原 skip 的 DB 集成测试 + 5 个新回归用例，×3 连跑稳定）**；runtime 11/11（×5 连跑稳定）。
- 迁移 0001–0003 + 种子 H-1 完整率 100%；seed 复跑幂等（新写 0 / 丢弃 100）。
- 安全门禁 6/6：gateway UPDATE/DELETE biz_events 被拒；app INSERT biz_events 被拒；不设/错设 workspace 上下文 0 行；正确上下文可见。
- server `/health` + `/trpc/system.health` 200（db:up）；web build 绿。
- 端到端实测：loginAs 签 JWT → members.list 3 人 / threads.list / approvals.list 全部真实返回（#22 修复前 loginAs 即 NOT_FOUND）。

### 事实源偏差登记
- 仓库 docs/ 无 PROGRESS.md / DECISIONS.md / MASTERPLAN.md / RELAY.md（技能协议假定的治理文档在远程 main 不存在）；本轮起以 CHANGELOG.md + 本文件 + 代码为事实源。
- 仓库实为 **public**（非私有），License Apache-2.0；README badge 的 dsh 链接（deepseek-ai/dsh）与实际上游（deepseek-ai/deepseek-harness）不一致，建议修正。

### 当前游标 → 下一轮
- 评估 P3 清单第 1–3 项（DB 层加固，一个 commit 一项）；
- apps/web 前端九大页走查（本轮聚焦后端与数据层，前端仅 build 验证 + DispatchBar #18 修复点代码确认）；
- dsh 稳定 1.x 发布后按 §2.5 流程升级评估。
