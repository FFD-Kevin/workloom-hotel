# vendor/dsh · DeepSeek Harness fork 锁定信息（D12 / B0）

| 项 | 值 |
|---|---|
| 包 | `@deepseek-ai/dsh`（CLI 聚合包；运行时依赖 `@deepseek-ai/dsh-*` / `cordis-plugin-*` 全家桶） |
| 锁定版本 | `0.1.0-rc.6`（npm 发布时间 2026-08-13T12:35:03Z） |
| 来源 | `https://registry.npmjs.org/@deepseek-ai/dsh/-/dsh-0.1.0-rc.6.tgz` |
| integrity（入库时实测） | `sha512-brpZfED7ieRa2PQ5tUxMhHrM1pb2CmKFVM/f6yMULBDMicahk+Z2OsHgTwTDnoiZm23Ftu9rQz0NN4pflaoJcg==`（与 registry 元数据逐字符一致 ✅） |
| License | MIT |
| 上游仓库 | `github.com/deepseek-ai/deepseek-harness`（`apps/cli` 目录） |
| 入库日期 | 2026-08-16 |
| 入库方式 | npm tarball 解压至本目录（`--strip-components=1`），未做任何源码修改 |

## 纪律

- 本目录**只读**：任何修改必须先复制出去再改，保持与上游 rc.6 字节一致，可审计。
- 运行时依赖解析仍走 pnpm（`pnpm add @deepseek-ai/dsh@0.1.0-rc.6` 于使用方包）；本目录是**审计基线 + 文档事实源**，升级前对照 diff。
- 升级触发条件（总纲 §7 停车场）：官方发布稳定 1.x 后，跑契约测试套件评估升级；升级前必须全绿。
- 已知原生依赖坑（B0 实测）：`node-pty` 需 pnpm 侧批准构建脚本（`pnpm.onlyBuiltDependencies: ["node-pty"]` + `pnpm rebuild node-pty`），否则 `dsh web` 启动即报 `pty.node` 缺失。已在 `.dsh profile` 与本仓库根 `package.json` 双处声明。

## 参考文档（上游 repo `docs/`，2026-08-16 核验）

- `docs/architecture.zh.md` — 总体架构
- `docs/capability-seams.zh.md` — 全部能力 seam 与核心服务清单（D12 seam 表的官方依据）
- `docs/cookbook/extension-cookbook.zh.md` — 钩子插件 / 工具插件 / UI 插件 / 协议驱动形态
- `docs/cordis-tutorial/01-first-plugin.zh.md` — Cordis 插件最小范式（`export apply(ctx)`）
- `docs/subsystems/{session,persistence,approval,jobs,skills,invariants,credentials}.zh.md`
- `docs/user/develop/practice/llm-adapter.zh.md` — 自研 LLM adapter 指南
