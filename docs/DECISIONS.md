# DECISIONS.md · WorkLoom IM 底座架构决策记录（ADR）

> 追加不改旧。本文件于审计第 5 轮补建（第 1 轮登记的事实源偏差：远程 main 此前无治理文档）。
> D1–D12 已于第 7 轮回收（见下方「历史决策回收」节，仅登记代码/文档中有明确出处者）；自 D13 起在此追加。

---

## 历史决策回收（D1–D14，2026-08-21 第 7 轮整理）

> 出处为代码注释/VENDOR 文档中的 `(D<n>)` 引用。无出处者不臆造，如实标注「待考」。

| 编号 | 决策 | 出处 |
|---|---|---|
| D1 | 待考（仓库内无引用） | — |
| D2 | 首版唯一行业 Bundle = `bundles/hotel`（workloom-hotel） | `apps/server/src/trpc/router.ts` |
| D3 | 待考（仓库内无引用） | — |
| D4 | LLM 默认 mock provider 全流程可跑（OpenAI 兼容网关 + 内置确定性 Mock；无真实凭据可开发可测试） | `packages/base/model-router/providers.ts`、`im-channels/cards.ts` |
| D5 | DDL 事实源 = migrations 手写 SQL；`schema.ts` 仅类型镜像，不生 DDL | `packages/db/src/schema.ts` |
| D6 | 待考（仓库内无引用） | — |
| D7 | 首版审批/通道仅 inapp 本地回环；外部 IM 连接器进停车场；手势回调后由回调侧回发结果卡（原地更新简化语义） | `review-console/index.ts`、`im-channels/registry.ts`、`cards.ts` |
| D8 | 待考（仓库内无引用） | — |
| D9 | 待考（仓库内无引用） | — |
| D10 | 待考（引用点已不可考） | — |
| D11 | 待考（仓库内无引用） | — |
| D12 | dsh（DeepSeek Harness）作 L1 运行时地基：vendor 锁定 + integrity 核验 + seam 精确对接（plugins 薄壳适配），九域护城河自研 | `vendor/dsh/VENDOR.md`、`packages/runtime/plugins/README.md` |
| D14 | 审批卡片从 inapp 升级为多通道（dingtalk/wecom/feishu 经 dsh-im；未启用通道拒绝并留痕） | `im-channels/callback.ts`、`cards.ts` |

> D13 起为审计期新决策，见下。D 编号有缺（D13 前无 D13 前史可考者）不影响使用——新决策顺延编号即可。

---

## D13 · 事件编号锁粒度与哈希链粒度（2026-08-21，审计 #32 后续评估）

**背景**：`appendEvent` 的 advisory 锁是 tenant 级（`event-chain:<tenantId>`），但链尾读取在 RLS 下按 workspace 过滤——同 tenant 多 workspace 时，锁粒度（tenant）与链粒度（workspace）不一致。

**选项评估**：

| 方案 | 分析 | 结论 |
|---|---|---|
| A. 锁降 workspace 级 | 编号分配 `MAX(seq)+1` 在 RLS 下按 workspace 过滤；两区并发会分配相同 E-N → `UNIQUE(tenant_id,event_id)` 冲突 → ON CONFLICT DO NOTHING → **第二方事件被静默幂等丢弃（数据丢失）** | ❌ 否决 |
| B. 维持 tenant 锁 + workspace 链 | 编号 tenant 内全局单调唯一；每 workspace 一条独立审计链（prev_hash 自本区 GENESIS 起）；verify-chain 按 workspace 分段验证，口径自洽 | ✅ 采纳 |
| C. tenant 单链（链尾读取绕过 RLS） | 需 owner 通道或 SECURITY DEFINER 函数读他区链尾——RLS 防线开口，安全降级 | ❌ 否决 |
| D. event_id 加 workspace 前缀 | 破坏 PRD 展示口径（E-N），且 UNIQUE 约束需重建 | ❌ 否决 |

**决策（B）**：语义定型为「event_id = tenant 级唯一编号（锁保证）；哈希链 = workspace 级审计链（RLS 保证）」。两者粒度不同是**有意设计**而非缺陷：编号唯一性服务于幂等键，链完整性服务于单工作区审计验证。

**验证**：`pnpm db:verify-chain` 按 workspace 分段逐条重算（干净库 100/100 一致，CI 门禁项）。

---

## D15 · 技能市场 industry 层开放的前置门禁（2026-08-21，第 8 轮安全评估）

**背景**：skills 三级（official / team / industry）中 industry「脱敏后跨组织共享」在 `isSignedSource` 首版不放行（return false），`installSkill` 对 `desensitized=false` 拦截。路线图拟开放 industry 层，本轮做前置安全评估。

**现状防线**：desensitized 标志拦截（L8.1）、team 级 workspace 前缀隔离（#23）、安装冲突审批（detectFenceConflicts）、运行时按安装快照算围栏并集（#24）、卸载读快照撤销（#40）。

**结论：暂不开放，先建五项机制位**（全部就位前维持 industry 白名单外）：

| # | 机制位 | 风险（不建的后果） |
|---|---|---|
| 1 | **上架脱敏扫描**（非人工标志）：forge/上架流水线强制跑 PII 检测（复用 maskText）+ 敏感词清单，正文命中即拒 | desensitized 是人工勾选，无机制验证——含客人 PII 的技能正文可跨组织泄露 |
| 2 | **审核流水线留痕**：上架 = 提案事件 + 异工作区双人复核手势（复用 approvals 域），全程进事件库 | 无审核留痕则「谁批的上架」不可问责，违背黑匣子原则 |
| 3 | **供应链注入评估**：industry 技能正文进入 Agent 上下文（prompt 面），上架前需经注入对抗用例集（复用套件 M 域模式） | 恶意技能可诱导 Agent 越权写动作（围栏按声明绑定判定，声明之外的行为约束依赖正文可信） |
| 4 | **全局吊销列表（kill switch）**：发现恶意/缺陷技能时运营方可全局吊销，运行时装配（resolveAgentFenceBindings）与 install 双点排除 | 当前无撤销通道——已安装的恶意技能只能逐工作区手动卸载 |
| 5 | **版本通道与升级提示**：industry 技能版本变更对已安装工作区可见（不自动升级），变更 diff 进审批 | 作者发新版后已装工作区无感知，静默滞留旧版（含已知缺陷版本） |

**验证口径**：五项机制各自带回归测试进 `scripts/suite.ts`（H 域扩充）；全部落地后再评 industry 白名单开口（届时本 ADR 追加修订记录，不改旧文）。
