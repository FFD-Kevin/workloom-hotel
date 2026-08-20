/**
 * runtime · preset 装配三要素校验（F3.6/L3.7）：生成前必读「档案+阶段+目标」，缺一拒绝执行
 * 装配内容：工具集 + 提示词段 + 围栏声明 + 档案上下文（bundles/hotel presets 装载形态）
 */
import type pg from "pg";

export interface AssembleInput {
  workspaceId: string;
  presetKey: string;
  /** 任务目标（派遣文本/快捷目标） */
  goal?: string;
}

export interface AssembledPreset {
  agentId: string;
  presetKey: string;
  version: string;
  fenceBindings: string[];
  tools: Array<{ name: string; access: string; desc: string }>;
  prompt: unknown;
  /** 三要素实物（注入提示词的档案上下文） */
  essentials: { archive: Record<string, unknown>; stage: string; goal: string };
}

export class AssemblyReject extends Error {
  constructor(public readonly missing: string[], message: string) {
    super(message);
    this.name = "AssemblyReject";
  }
}

/**
 * 装配校验（L3.7）：档案（profiles.archive）/ 阶段（workspaces.stage）/ 目标（goal）缺一拒绝
 */
export async function assemblePreset(
  app: pg.Pool,
  scope: { tenantId: string; workspaceId: string },
  input: AssembleInput,
): Promise<AssembledPreset> {
  const client = await app.connect();
  try {
    // 事务级 RLS 上下文必须在显式事务内设置：autocommit 下 set_config(...,true) 语句结束即失效
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.workspace_id', $1, true)", [scope.workspaceId]);
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [scope.tenantId]);

    const ag = await client.query<{
      id: string; preset_key: string; version: string; fence_bindings: string[];
      meta: { tools?: AssembledPreset["tools"]; prompt?: unknown }; status: string;
    }>(
      `SELECT id, preset_key, version, fence_bindings, meta, status
       FROM agents WHERE workspace_id=$1 AND preset_key=$2`,
      [scope.workspaceId, input.presetKey],
    );
    const agent = ag.rows[0];
    if (!agent) throw new AssemblyReject(["preset"], `Agent preset「${input.presetKey}」未注册`);
    if (agent.status !== "ready") throw new AssemblyReject(["preset"], `preset「${input.presetKey}」状态 ${agent.status}（invalid/disabled 不可装配）`);

    const prof = await client.query<{ archive: Record<string, unknown> }>(
      `SELECT archive FROM profiles WHERE workspace_id=$1`,
      [scope.workspaceId],
    );
    const ws = await client.query<{ stage: string | null }>(
      `SELECT stage FROM workspaces WHERE id=$1`,
      [scope.workspaceId],
    );

    const missing: string[] = [];
    if (!prof.rows[0]?.archive || Object.keys(prof.rows[0].archive).length === 0) missing.push("档案");
    if (!ws.rows[0]?.stage) missing.push("阶段");
    if (!input.goal || input.goal.trim() === "") missing.push("目标");
    if (missing.length > 0) {
      throw new AssemblyReject(missing, `三要素缺失（${missing.join("、")}），拒绝执行（L3.7）`);
    }

    return {
      agentId: agent.id,
      presetKey: agent.preset_key,
      version: agent.version,
      fenceBindings: agent.fence_bindings,
      tools: agent.meta.tools ?? [],
      prompt: agent.meta.prompt ?? null,
      essentials: { archive: prof.rows[0]!.archive, stage: ws.rows[0]!.stage!, goal: input.goal! },
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    await client.query("COMMIT").catch(() => undefined);
    client.release();
  }
}
