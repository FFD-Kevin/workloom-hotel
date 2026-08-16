# 接力协议 · WorkLoom IM 底座

本协议保证：**任何 AI 工具、任何新窗口，都能从本仓库无缝承接开发**。事实源只有一处——本仓库。

## 1. 事实源清单（读取顺序）

1. `docs/PROGRESS.md` —— 阶段总览 + 任务卡状态 + 最后游标（下一步精确到文件）
2. `docs/DECISIONS.md` —— 关键决策（ADR）
3. `docs/MASTERPLAN.md` —— 项目落地总纲（技术栈/架构/ER/四阶段任务卡/验收断言）
4. `docs/prd/` —— 需求与视觉原件（PRD V2.5 / 技术方案 V3 / 设计规范 V1.0 / 高保真原型 V4.0 / 游戏规则手册 V1.0）

## 2. 开发纪律（所有工具共同遵守）

- 每完成一个任务卡/批次：更新 `PROGRESS.md` → commit → push；阶段收尾打 tag（`v0.1.0` 等）。
- commit 格式：`卡号: 说明（PRD 编号回引）`，如 `B4: fence-engine 单调守卫与 dry-run（F2.3/F2.5）`。
- 代码注释与任务卡、commit 三处编号一致（F/L/E/US/G/M/P 回引 PRD V2.5）。
- 产出代码必须完整、可直接落位，不截断；新增依赖先核验仓库活跃状态与 License，pin 版本。
- 编码铁律见 `README.md` 第「编码铁律」节（网关瀑布 / append-only / 围栏无后门 / 隐藏非置灰等）。

## 3. 各工具接力方式

### Kimi 新窗口
用户说「继续迭代WorkLoom IM」「开发一下WorkLoom IM」「开发WorkLoom 大底座」等 → Kimi 读取本仓库 `PROGRESS.md`（或由用户粘贴最新内容），同步进展后继续。

### Codex / Claude Code / 其他 IDE 工具
clone 仓库后，把下面这段作为开场提示词（可按需删减）：

```
你在为「WorkLoom IM 底座」（企业 Agent IM）接力开发。先依次阅读：
docs/PROGRESS.md（进度游标）、docs/DECISIONS.md（决策）、docs/MASTERPLAN.md（总纲）、
docs/RELAY.md（本协议）；需求与视觉原件在 docs/prd/。
然后：① 用三句话复述当前状态与下一步任务卡；② 遵守 README.md 的编码铁律与
docs/DECISIONS.md 的全部决策；③ 只推进「最后游标」指向的下一个任务卡，产出完整可运行代码；
④ 完成后更新 docs/PROGRESS.md 并按 commit 规范提交。业务数字/阈值/编号一律以 PRD 为准，禁止编造。
```

## 4. 断档恢复

- 窗口中断/工具切换：以仓库 `PROGRESS.md` 的「最后游标」为准重做当前任务卡即可，已入库内容永远一致。
- 若发现本地与远端不一致：以远端 main 为准（`git fetch && git reset --hard origin/main`）。
