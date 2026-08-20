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
