/**
 * fence-engine · 版本化 + dry-run 回放 + 对象写锁（F2.4/F2.5/F2.6/L2.4/E2.5）
 *
 *  - dryRunReplay：新规则版本激活前，回放最近 10 条历史动作做模拟判定（DRY_RUN_REPLAY_LIMIT），
 *    报告落 fence_dry_runs（pending）；未确认不得激活（L2.4）
 *  - activateRuleVersion：dry-run 已确认 + 审批事件 ID 齐备才允许激活（F2.4 留痕）
 *  - withObjectLock：对象写锁（pg advisory try-lock；超时转「需介入」，禁强制抢锁，E2.5）
 */
import type pg from "pg";
import { DRY_RUN_REPLAY_LIMIT, OBJECT_LOCK_TIMEOUT_MS, type BusinessEvent } from "@workloom/shared";
import { judge, type JudgeVerdict, type RuntimeRule } from "./judge.js";

/* ---------- dry-run 回放（F2.5） ---------- */

export interface DryRunReport {
  ruleId: string;
  ruleVersion: string;
  replayed: number;
  wouldBlock: string[]; // event_id 列表
  wouldReview: string[];
  unchanged: number;
  impact: string; // 人读摘要
}

/** 从五元事件还原判定输入 */
export function eventToJudgeInput(ev: BusinessEvent): {
  object: { type: string; id?: string };
  action: string;
  params?: Record<string, unknown>;
  before?: unknown;
  after?: unknown;
  context?: Record<string, unknown>;
} {
  return {
    object: { type: ev.object.type, id: ev.object.id },
    action: ev.decision.action,
    params: (ev.decision as Record<string, unknown>).params as Record<string, unknown> | undefined,
    before: ev.decision.before,
    after: ev.decision.after,
    context: ev.context as Record<string, unknown>,
  };
}

/** 纯回放：给定历史事件与候选规则集，产出模拟判定报告（纯函数） */
export function replayRules(
  events: BusinessEvent[],
  rules: RuntimeRule[],
  defaultLevel: "auto" | "review" | "block",
): { verdicts: Array<{ eventId: string; verdict: JudgeVerdict }> } {
  return {
    verdicts: events.map((ev) => ({
      eventId: ev.event_id,
      verdict: judge(eventToJudgeInput(ev), rules, defaultLevel),
    })),
  };
}

/** dry-run 入库：回放最近 10 条 → fence_dry_runs（pending，待人类确认） */
export async function createDryRun(
  app: pg.Pool,
  scope: { tenantId: string; workspaceId: string },
  input: { ruleId: string; ruleVersion: string; rules: RuntimeRule[]; defaultLevel: "auto" | "review" | "block"; createdBy: string },
): Promise<{ dryRunId: string; report: DryRunReport }> {
  const client = await app.connect();
  try {
    await client.query("SELECT set_config('app.workspace_id', $1, false)", [scope.workspaceId]);
    await client.query("SELECT set_config('app.tenant_id', $1, false)", [scope.tenantId]);
    const rows = await client.query<{ payload: BusinessEvent }>(
      `SELECT payload FROM biz_events WHERE tenant_id=$1 AND workspace_id=$2
       ORDER BY seq DESC LIMIT $3`,
      [scope.tenantId, scope.workspaceId, DRY_RUN_REPLAY_LIMIT],
    );
    const events = rows.rows.map((r) => r.payload);
    const { verdicts } = replayRules(events, input.rules, input.defaultLevel);
    const report: DryRunReport = {
      ruleId: input.ruleId,
      ruleVersion: input.ruleVersion,
      replayed: events.length,
      wouldBlock: verdicts.filter((v) => v.verdict.level === "block").map((v) => v.eventId),
      wouldReview: verdicts.filter((v) => v.verdict.level === "review").map((v) => v.eventId),
      unchanged: verdicts.filter((v) => v.verdict.level === "auto").length,
      impact: `回放最近 ${events.length} 条：熔断 ${verdicts.filter((v) => v.verdict.level === "block").length} · 挂起 ${verdicts.filter((v) => v.verdict.level === "review").length} · 放行 ${verdicts.filter((v) => v.verdict.level === "auto").length}`,
    };
    const dryRunId = `fdr-${input.ruleId.toLowerCase()}-${Date.now().toString(36)}`;
    await client.query(
      `INSERT INTO fence_dry_runs (id, workspace_id, rule_id, rule_version, report, status, created_by)
       VALUES ($1,$2,$3,$4,$5,'pending',$6)`,
      [dryRunId, scope.workspaceId, input.ruleId, input.ruleVersion, JSON.stringify(report), input.createdBy],
    );
    return { dryRunId, report };
  } finally {
    client.release();
  }
}

/** 确认 dry-run（人类看过报告；pending→confirmed）。未确认不得激活（L2.4） */
export async function confirmDryRun(
  app: pg.Pool,
  scope: { tenantId: string; workspaceId: string },
  dryRunId: string,
): Promise<void> {
  const client = await app.connect();
  try {
    await client.query("SELECT set_config('app.workspace_id', $1, false)", [scope.workspaceId]);
    const r = await client.query(
      `UPDATE fence_dry_runs SET status='confirmed' WHERE id=$1 AND workspace_id=$2 AND status='pending'`,
      [dryRunId, scope.workspaceId],
    );
    if (r.rowCount === 0) throw new Error(`dry-run ${dryRunId} 不存在或非 pending（幂等约束）`);
  } finally {
    client.release();
  }
}

/** 激活新版本（F2.4）：dry-run 已确认 + 审批事件 ID 齐备 */
export async function activateRuleVersion(
  app: pg.Pool,
  scope: { tenantId: string; workspaceId: string },
  input: { ruleRowId: string; dryRunId: string; approvalEventId: string },
): Promise<void> {
  const client = await app.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.workspace_id', $1, true)", [scope.workspaceId]);
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [scope.tenantId]);
    const dr = await client.query<{ status: string }>(
      `SELECT status FROM fence_dry_runs WHERE id=$1 AND workspace_id=$2`,
      [input.dryRunId, scope.workspaceId],
    );
    if (dr.rows[0]?.status !== "confirmed") {
      throw new Error(`dry-run ${input.dryRunId} 未确认，禁止激活（L2.4）`);
    }
    const r = await client.query(
      `UPDATE fence_rules SET status='active', approved_event_id=$3
       WHERE id=$1 AND workspace_id=$2 AND status IN ('draft','pending_approval')`,
      [input.ruleRowId, scope.workspaceId, input.approvalEventId],
    );
    if (r.rowCount === 0) throw new Error(`规则 ${input.ruleRowId} 状态不允许激活`);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/* ---------- 对象写锁（E2.5） ---------- */

export class ObjectLockTimeout extends Error {
  constructor(public readonly objectKey: string) {
    super(`对象写锁超时：${objectKey}（转「需介入」，禁止强制抢锁，E2.5）`);
    this.name = "ObjectLockTimeout";
  }
}

/**
 * 对象写锁：pg advisory try-lock（租户+对象键）+ 轮询至超时。
 * 锁随事务释放；超时抛 ObjectLockTimeout（调用方写「需介入」事件，L4.2）。
 */
export async function withObjectLock<T>(
  gateway: pg.Pool,
  objectKey: string,
  fn: (client: pg.PoolClient) => Promise<T>,
  timeoutMs = OBJECT_LOCK_TIMEOUT_MS,
): Promise<T> {
  const client = await gateway.connect();
  const lockKey = `obj:${objectKey}`;
  try {
    await client.query("BEGIN");
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const r = await client.query<{ ok: boolean }>(`SELECT pg_try_advisory_xact_lock(hashtext($1)) AS ok`, [lockKey]);
      if (r.rows[0]?.ok) break;
      if (Date.now() > deadline) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw new ObjectLockTimeout(objectKey);
      }
      await new Promise((r2) => setTimeout(r2, 100));
    }
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
