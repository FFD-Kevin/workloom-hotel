# 关键决策记录（ADR）· WorkLoom IM 底座

> 追加不改旧；推翻旧决策时新增条目并注明「取代 Dx」。完整论证见 `MASTERPLAN.md`。

| # | 决策 | 理由 / 影响 |
|---|---|---|
| D1 | 运行时不直接依赖 dsh（DeepSeek Harness，npm `@deepseek-ai/dsh@0.1.0-rc.6`），薄自研运行时 + 概念同构 + 迁移 seam 预留 | dsh 2026-08-13 才开源，RC 无稳定 API 文档；对话框/AI 接力开发不可对着未知 API 写码。迁移触发条件：dsh 稳定 1.x 且文档成熟（停车场） |
| D2 | 首版只做酒店版 Bundle（bundles/hotel） | PRD P 章示例均为酒店场景；营销版结构同构后补 |
| D3 | 数据库只用 PostgreSQL 17 + pgvector（docker-compose）；备选 brew postgresql@17 | RLS/JSONB GIN/向量都依赖 PG；SQLite 边缘形态进停车场 |
| D4 | LLM 经 OpenAI 兼容网关（deepseek/moonshot/zhipu/openai 可切），内置确定性 Mock Provider | 无 API Key 也能跑通全部页面与演示剧本；接力开发零外部凭据依赖 |
| D5 | 前端唯一视觉事实源 = 高保真原型 V4.0 + 星盟战舰设计规范 V1.0；组件命名 `P{页码}E{角标}`；状态变体 `页面id_状态` | 禁止自由发挥；25 屏状态变体逐屏对账 |
| D6 | 实时性用轮询（线程/夜班 5s，其余 10–15s），不上 WebSocket | PRD F3.4 明文口径；WS 进停车场 |
| D7 | 重外围件后置：Tauri/Taro/IM 连接器/mem0/Presidio/WrenAI/LiteLLM/Stagehand 全部停车场 | 首版同构薄自研替代（脱敏=内置规则模块；NL 检索=结构化过滤+LLM 直译；IM=channel=inapp 本地回环） |
| D8 | 仓库 `workloom-im` 私有；GitHub 不允许中文仓库名；令牌不进对话/记忆/文件 | `workloom` 已属小WorkLoom；安全纪律 |
| D9 | 迁移采用手写 SQL + tsx 执行器（`scripts/migrate.ts`），drizzle schema 仅作类型源 | drizzle-kit 对 RLS/触发器/双角色表达弱；手写 SQL 入库可审计 |
| D10 | 应用双角色连接池：`workloom_app`（biz_events 只读）+ `workloom_gateway`（唯一可 INSERT biz_events） | F1.2 旁路直写防控落到 DB 层；append-only 另有触发器双保险 |
| D11 | dsh 接入路径确认（2026-08-16）：保持 D1，执行路径 A——薄自研运行时先行，**阶段二完成后做一次 dsh 对接评估**（通读官方 docs + 沙箱实测 + 适配报告），再定是否迁移 L1 层 | 用户明确无偏好，按推荐执行；评估时核验点：`@deepseek-ai/dsh` 是否已出稳定版、capability-seams 文档与六插件概念的映射成本、迁移工作量 |
