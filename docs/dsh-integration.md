# dsh 对接报告（阶段二 B0 产出 · D12）

> 结论先行：**DeepSeek Harness `0.1.0-rc.6` 可以作为 WorkLoom IM 底座 L1 运行时地基**。
> 三项实证全部通过；六插件 × seam 映射表落位（§3）；双轨纪律不变——六插件核心逻辑为自研护城河、与 dsh 解耦，tenancy/RLS/版本裁剪不进 dsh（D12）。

## 1. B0 实证记录（2026-08-16 · Linux 沙箱 · Node 24.19 / pnpm 10.14）

| # | 实证项 | 结果 | 证据 |
|---|---|---|---|
| 1 | vendor fork 锁 rc.6 | ✅ | `vendor/dsh/` 由 npm tarball 解压，integrity 与 registry 逐字符一致（`vendor/dsh/VENDOR.md`） |
| 2 | `pnpm dsh web` 跑通 | ✅ | `pnpm add @deepseek-ai/dsh@0.1.0-rc.6` → `pnpm dsh web --port 4099` → `http://127.0.0.1:4099` 返回 200，Web UI（New Session / Workspaces / Settings）正常渲染 |
| 3 | 最小插件挂载（hello-fence） | ✅ | profile `cordis.patch.yml` 以 `- insert: [{id, name: './hello-fence.js'}]` 挂载；启动日志出现 `[hello-fence] mounted · WorkLoom B0 最小插件在 dsh 内加载成功`；插件以 cookbook「钩子插件」形态挂入 `tools/pre-execute` 瀑布 |

**踩坑记录（接力者必读）**：
1. `node-pty` 是原生模块，pnpm 10 默认不跑 postinstall → 启动报 `pty.node` 缺失。解法：消费方 `package.json` 声明 `pnpm.onlyBuiltDependencies: ["node-pty"]` 后 `pnpm rebuild node-pty`（需 python3/make/g++，macOS 自带 Xcode CLT 即可）。
2. profile 由 `$DSH_HOME/profiles/<name>` 承载：`package.json`（`dsh.profile.bundles`）+ `cordis.patch.yml`（用户 patch 层）。`web`/`headless` profile 首次启动自动从模板初始化。
3. patch 语法：顶层为数组，元素 `- insert: [{id, name, config?}]`；`name` 可为相对 profile 目录的模块路径或 npm 包名；行序无加载语义（激活由服务依赖 inject 驱动）。
4.  launcher flag 必须写在最前（`dsh web --port 4099` 中 `--port` 属 web app）；`dsh --dump-config` 可不启动查看组合后配置树。

## 2. dsh 微内核事实（官方文档核验：docs/architecture + capability-seams + cookbook，中英双语）

- 插件 = 命名导出 `apply(ctx)` 的模块（函数/对象/Service 类三形态）；组合 = profile 的 bundle patch 层 + 用户 patch 层叠加。
- 扩展点全部是 **Cordis 事件/seam**：`tools/pre-execute`（waterfall 可重排策略层）、`ctx.tools.guard()`（单调最终拒绝）、`tools/execute`（包裹分发）、`tools/post-execute`、`tools/result`（不可变结果观察）。
- 会话 = 仅追加日志 + `session/event` 事件流；回放 = `sessions.create(id, { seed })`——与五元事件 append-only/回滚语义同构。
- 微内核声明可验证：每个产品功能映射到文档化扩展点上的监听器，没有一行修改循环本身（cookbook「功能→机制映射」表）。

## 3. 六插件 × seam 映射表（D12 裁定落地）

| WorkLoom 插件（L2 自研护城河） | dsh seam / 扩展点（L1 地基） | 对接形态（packages/runtime） | 官方依据 |
|---|---|---|---|
| **flydata-core** 消息总线（五元事件/记忆/回溯/回滚） | `ctx.sessionPersistence`（持久会话持久化 seam）+ `session/event` 事件流 | `providers/session-persistence-pg`：SessionEvent → 五元事件投影 → PG biz_events+哈希链（G8）；`bridges/` 事件桥 | capability-seams 表（sessionPersistence 实现可替换：jsonl/sqlite 为官方实现） |
| **fence-engine** 行动权限（三级判定/单调基线/dry-run） | `tools/pre-execute` waterfall + `ctx.tools.guard()` 单调守卫 | `plugins/fence-engine`：工具调用进 waterfall → 自研纯函数判定器（auto/review/block）；基线单调守卫用 `guard()`（与 dsh「单调最终拒绝」语义一致）；**hello-fence 已实证该挂载点** | cookbook §钩子插件（权限门禁示例）+ adding-a-tool §execution-policy |
| **review-console** 原生审批（统一队列/三手势/批量） | `ctx.approval`（approval/request waterfall）+ `ctx.userQuestions`（挂起问答） | `plugins/review-console`：review 判定 → approval request 挂起 → 三手势回写自研 approvals 域（权重 1/2/3 留 WorkLoom 侧） | capability-seams 表（approval seam，无回答方时 unavailable 关闭失败）|
| **night-shift** 在线时长（候选清单/状态机/一键暂停/决策包） | `ctx.jobs`（后台 job 注册表）+ `ctx.commands`（人类命令）+ cron 插件模式 | `plugins/night-shift`：夜班任务注册为 jobs；`/开启夜班` `/一键暂停` 注册为 commands；cron 触发 → 空闲 `followup(source:{kind:'cron'})`／忙碌 `inject()` | cookbook 功能映射「定时任务（cron）」+ capability-seams 表 jobs/commands |
| **model-router** 消息生产成本（分级/峰谷/降级链/计量/熔断） | `ctx.llm`（adapter 注册表，`registerAdapter`） | `providers/llm-workloom-router`：自研 LlmAdapter 子类，内部承载分级路由/峰谷窗口/降级链/逐事件 model_trace 计量；Mock Provider 作为同接口 adapter | cookbook 功能映射「模型适配器」+ llm-adapter 指南 |
| **tenancy** 组织与商业化（隔离/版本能力/积分） | **不进 dsh**（双轨纪律） | 留 apps/server 层：RLS/版本能力矩阵/积分账户投影；凭据经 `providers/credentials-pg` 对接 `ctx.credentials`（配置只带引用，消费方按操作解析，轮换即生效——与 F7.7/L7.3 同构） | D12；capability-seams 表 credentials seam |

**横切映射**：
- **G8 不变量「模型可见即已记录」** → `ctx.invariants`（包所属不变量注册表，session/agent/agent-loop 均为消费方）注册校验。
- **7 Agent preset 装配** → `ctx.agentPresets`（preset cordis.yml 挂载到 agent 作用域；拒绝向根 realm 发布服务的 preset——天然契合 F2.10 禁写纪律）。
- **技能广场** → `ctx.skills`（provider 合并目录 + tool-skill 调用注入；hotel bundle 3 官方技能即 SKILL.md 形态，同构）。
- **子调用同瀑布（F2.1/H-4）** → `ctx.subagents` 提供方注册表 + tool-subagent；子 agent 的工具调用仍走同一 `tools/pre-execute` 瀑布。

## 4. 接入节奏（D12 既定，本报告确认可行）

- 自 **B8** 起运行时层（三态派遣/任务循环/夜班调度）基于 dsh 开发；B1–B7 的六插件服务层仍按纯服务层先行（不碰 HTTP、不碰 dsh），B8 统一做 dsh 插件挂载（Cordis 生命周期）。
- `packages/runtime` 目录结构按总纲 §2.2 不变：`plugins/`（六插件 dsh 挂载点）、`providers/`（session-persistence-pg / llm-workloom-router / credentials-pg）、`bridges/`（事件桥+G8 校验）。

## 5. 风险与缓解

| 风险 | 等级 | 缓解 |
|---|---|---|
| rc.6 无稳定 API 承诺，上游快速演进 | 中 | vendor fork 锁死 + 只依赖文档化 seam（capability-seams 有完整性守卫脚本维护）；升级走停车场触发条件（稳定 1.x + 契约测试全绿） |
| node-pty 原生构建在部分 Mac 环境失败 | 低 | README 已写 `onlyBuiltDependencies` 纪律；Xcode CLT 前置检查进 doctor.sh（阶段四 E2 补） |
| dsh 会话词汇与五元事件非一一对应 | 中 | bridges 事件桥做投影白名单 + G8 不变量校验兜底；B8 卡验收含「kill -9 重放续跑且幂等（H-5）」实证 |
| Web UI 为英文内测态（Internal Testing Notice） | 低 | WorkLoom 前端自研（星盟战舰），dsh web 仅作开发期调试台，不进交付面 |

---

*B0 完成标志核验：dsh web 可访问 ✅；最小插件在 dsh 内加载成功 ✅；报告入库 ✅（本文件）*
