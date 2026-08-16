# WorkLoom IM 底座

WorkLoom 织元 · 企业 Agent IM —— 行业可装配 Agent 发行版的通用业务底座。
**本仓库是唯一事实源**：需求、计划、进度、决策、代码全部入库，任何 AI 工具（Kimi / Codex / Claude Code）clone 后即可无缝接力开发。

> 同账号下 `workloom` 仓库属于另一独立项目「小WorkLoom」（企业智能执行中枢 MVP），与本项目计划各自推进，请勿混淆。

## 事实源地图

| 内容 | 位置 |
| --- | --- |
| 需求 PRD（V2.5，唯一需求事实源） | `docs/prd/WorkLoom织元·Agent时代的IM·产品需求文档PRD-V2.5.pdf` |
| 技术方案（V3） | `docs/prd/WorkLoom织元-企业AgentIM-通用底座技术方案V3.pdf` |
| 视觉事实源（设计规范 V1.0 + 高保真原型 V4.0 + 页面全集 PPT） | `docs/prd/` 内对应文件 |
| 游戏化叙事（规则手册 V1.0） | `docs/prd/太空驾驶舱游戏规则手册 V1.0（星盟战舰游戏策划案）.pdf` |
| **项目落地总纲（技术栈/架构/ER/四阶段任务卡）** | `docs/MASTERPLAN.md` |
| **开发进度游标（接力核心）** | `docs/PROGRESS.md` |
| **关键决策记录（ADR）** | `docs/DECISIONS.md` |
| **接力协议（含其他 AI 工具交接提示词）** | `docs/RELAY.md` |

## 快速开始（macOS）

```bash
# 前置：Homebrew、Docker Desktop 或 OrbStack、Node 24 LTS（nvm）、pnpm、git
git clone git@github.com:geniusdapeng-collab/workloom-im.git
cd workloom-im
bash scripts/doctor.sh       # 环境自检
./scripts/start.sh           # 一键：起 PG → 迁移 → 种子 → server(8787)+web(5173)
# 浏览器打开 http://localhost:5173 → P1 主甲板可见 tRPC 握手 200 / 数据库 up

# 常用命令
pnpm -C packages/shared test # 五元事件 Schema 测试（4 条）
./scripts/reset.sh           # 重置演示数据（append-only 事件库只能整库重建）
./scripts/stop.sh            # 停止 server/web（--pg 同时停 PG 容器）
```

## 目录结构

```
apps/        server（Hono+tRPC 11）· web（React 19+Vite 7+Tailwind 4）—— 阶段一批次 2 起
packages/    shared（五元事件 Schema/枚举/常量）· db（18 表类型镜像 + 手写迁移）· runtime · base —— 阶段二起
bundles/     hotel（7 Agent preset + 基线围栏 R1–R6 + 枚举 + 档案 Schema + 官方技能套件）
scripts/     doctor.sh · migrate.ts · seed.ts（批次 2）· start.sh / stop.sh（批次 2）
docs/        MASTERPLAN / PROGRESS / DECISIONS / RELAY / prd（原件）
```

## 编码铁律

1. 一切事件写入必经安全网关三段瀑布（权限→脱敏→高风险授权），`biz_events` 仅 `workloom_gateway` 角色可 INSERT（F1.2）。
2. 事件库 append-only：触发器禁 UPDATE/DELETE；回滚=逆向补偿事件（L1.1/F1.6）。
3. 围栏判定纯函数、无后门；未声明 `fence_bindings` 的 Agent 禁写（F2.1/F2.10）；基线只可加严（F2.3）。
4. 权限：服务端 403 / 越权查询返回空；前端隐藏非置灰（E2.6/L7.1）。
5. 需求编号（F/L/E/US/G/M/P）回引 PRD V2.5；业务数字与阈值零编造。
6. 界面视觉以高保真原型 V4.0 + 星盟战舰设计规范为唯一口径；组件命名 `P{页码}E{角标}`。
7. 令牌与密钥永不入库（`.env` 已 gitignore；credentials 表只存密文）。
