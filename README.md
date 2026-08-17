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
| dsh 对接报告（六插件 × seam 映射） | `docs/dsh-integration.md` |

## 快速开始（macOS）

目标：**从零到跑起来 ≤ 半天**。全流程默认 Mock（LLM/IM 均无需任何外部凭据），真实 Key 随时可插。

### 前置条件

| 依赖 | 安装 | 说明 |
| --- | --- | --- |
| Node 24 LTS | `brew install nvm && nvm install 24` | 24.x 即可 |
| pnpm 10 | `corepack enable && corepack prepare pnpm@10.14.0 --activate` | 随 Node 自带 corepack |
| PostgreSQL 17 + pgvector | **推荐** Docker Desktop / OrbStack（`docker compose up -d` 一条命令）；或 `brew install postgresql@17 pgvector` | start.sh 自动二选一 |
| git / Xcode CLT | `xcode-select --install` | CLT 仅 dsh 门禁编译 node-pty 时需要 |

### 一条命令启动

```bash
git clone git@github.com:geniusdapeng-collab/workloom-im.git
cd workloom-im
bash scripts/doctor.sh       # 环境自检（一屏报告，✅/⚠️/❌ 分级，❌ 即阻断项）
./scripts/start.sh           # 一键：起 PG → 迁移 → 种子 → server(8787)+web(5173)
# 浏览器打开 http://localhost:5173 → P1 主甲板可见 tRPC 握手 200 / 数据库 up
```

启动后想要「有戏的演示数据」与六条业务流程实跑：

```bash
pnpm demo                  # E2E 演示剧本：整库重置 → PF.1–PF.6 六流程逐条断言（44 条）
pnpm demo --no-reset       # 不重置复跑（幂等降级口径，42 条断言）
```

### 启动脚本四件套

| 脚本 | 用途 | 关键行为 |
| --- | --- | --- |
| `scripts/start.sh` | 一键启动 | 缺依赖给友好提示（不抛栈）；自动复制 `.env`；docker 优先、无 docker 回落本机 PG；迁移+种子幂等；端口占用前置拒绝 |
| `scripts/stop.sh` | 停止 | 按端口优雅终止不误杀；`--pg` 同时停 PG 容器（数据卷保留） |
| `scripts/reset.sh` | 重置演示数据 | append-only 事件库只能整库重建；`--yes` 跳过确认（demo/CI 用） |
| `scripts/doctor.sh` | 一屏自检 | 分区报告：运行时 → 工作目录 → 模型 → 凭据 → 会话存储（PG 连通/版本/pgvector/迁移计数/H-1 完整率/RLS 0 行实测/app 角色 INSERT 拒绝实测）→ 原生模块 → 端口；exit 0=无阻断项 |

> doctor 输出解读：✅ 通过；⚠️ 建议项（不影响启动，如 JWT_SECRET 仍为开发默认值）；❌ 阻断项（如 PG 连不通、node 版本不足），按提示修复后重跑即可。

### LLM 配置（可选；默认 mock 离线全通）

`.env` 中（不存在则从 `.env.example` 复制，start.sh 会自动做）：

```bash
LLM_PROVIDER=mock        # mock | deepseek | moonshot | zhipu | openai
LLM_BASE_URL=            # OpenAI 兼容网关地址（自托管网关填这里）
LLM_API_KEY=             # 真实 Key 填这里；mock 模式留空即可
LLM_MODEL=               # 留空用 provider 默认模型
```

纪律（D4）：开发与测试一律 mock 可跑通；真实 Key 属于用户侧自配，**永不入库**。

### IM 通道（可选；默认 mock）

`IM_DRIVER=mock` 时审批卡片/手势回调全链在本地回环演示。接真实通道（钉钉/企业微信/飞书）：

```bash
bash scripts/install-im-channels.sh   # pin 安装 @xmanrui/dsh-im@0.2.2 + integrity 校验
pnpm dsh web                          # dsh 设置页 → IM机器人 → 填真实通道凭据
```

### dsh headless 回归门禁（E6 / H-5 验收载体）

```bash
bash scripts/dsh-gate.sh   # 用例一：最小任务全链（工具调用→围栏瀑布→事件落账验链）
                           # 用例二：kill -9 崩溃现场 → 链完整 + 会话事件重放零重复（H-5）
```

### Linux 沙箱 / 无 Mac 环境

```bash
bash scripts/devbox.sh          # 用户态一键重建：Node24 + PG17/pgvector + 依赖 + 迁移 + 种子
bash scripts/devbox.sh serve    # 同上 + 后台起 server/web
```

## 目录结构

```
apps/        server（Hono+tRPC 11）· web（React 19+Vite 7+Tailwind 4）
packages/    shared（五元事件 Schema/枚举/常量）· db（18 表类型镜像 + 手写迁移）
             base（flydata-core/fence-engine/review-console/model-router/night-shift/inspection/skills/bundles/im-channels）
             runtime（Quest 循环 + dsh 插件薄壳 plugins/ + dsh-gate 回归门禁）
bundles/     hotel（7 Agent preset + 基线围栏 R1–R6 + 枚举 + 档案 Schema + 官方技能套件）
scripts/     doctor.sh / start.sh / stop.sh / reset.sh / devbox.sh / demo.ts / dsh-gate.sh / migrate.ts / seed.ts / install-im-channels.sh
vendor/      dsh（@0.1.0-rc.6 锁版 fork）· dsh-im（@0.2.2 锁版）
docs/        MASTERPLAN / PROGRESS / DECISIONS / RELAY / dsh-integration / prd（原件）
```

## 编码铁律

1. 一切事件写入必经安全网关三段瀑布（权限→脱敏→高风险授权），`biz_events` 仅 `workloom_gateway` 角色可 INSERT（F1.2）。
2. 事件库 append-only：触发器禁 UPDATE/DELETE；回滚=逆向补偿事件（L1.1/F1.6）。
3. 围栏判定纯函数、无后门；未声明 `fence_bindings` 的 Agent 禁写（F2.1/F2.10）；基线只可加严（F2.3）。
4. 权限：服务端 403 / 越权查询返回空；前端隐藏非置灰（E2.6/L7.1）。
5. 需求编号（F/L/E/US/G/M/P）回引 PRD V2.5；业务数字与阈值零编造。
6. 界面视觉以高保真原型 V4.0 + 星盟战舰设计规范为唯一口径；组件命名 `P{页码}E{角标}`。
7. 令牌与密钥永不入库（`.env` 已 gitignore；credentials 表只存密文）。
