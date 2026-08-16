/**
 * tRPC 根路由（B5 状态：system / auth / members / threads 四个 router 挂载；
 * 其余 router（events / fence / approvals / nightShift / inspection / skills / bundle）
 * 在 B6–B10 逐卡挂载——见 MASTERPLAN §2.2）
 * 本文件同时是前端类型源：apps/web 经 `@workloom/server/router` 导入 AppRouter 类型。
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getAppPool, getGatewayPool, getOwnerPool } from "@workloom/db";
import {
  getCapabilities,
  getMember,
  listMembers,
  signDemoToken,
  type Identity,
} from "@workloom/base/tenancy";
import { gatewayAppend } from "@workloom/base/flydata-core";
import { makeReadableId } from "@workloom/shared";
import { capabilityProcedure, protectedProcedure, publicProcedure, router, scopeOf } from "./context.js";
import {
  ApprovalError,
  batchApprove,
  decide,
  expireSweep,
  listQueue,
} from "@workloom/base/review-console";
import { routeIntent, runQuest } from "@workloom/runtime";
import { MAX_CONCURRENT_THREADS } from "@workloom/shared";

/** system router：健康检查（公开） */
const systemRouter = router({
  health: publicProcedure.query(async () => {
    let db: "up" | "down" = "down";
    try {
      await getAppPool().query("SELECT 1");
      db = "up";
    } catch {
      db = "down";
    }
    return {
      ok: true,
      service: "workloom-im-server",
      phase: "阶段二 后端 API（B5）",
      db,
      time: new Date().toISOString(),
    };
  }),
});

/** auth router：演示身份登录（总纲 §2.4：选择种子成员签发 JWT） */
const authRouter = router({
  loginAs: publicProcedure
    .input(z.object({ workspaceSlug: z.string(), memberNo: z.string() }))
    .mutation(async ({ input }) => {
      const app = getAppPool();
      // 登录引导例外点（F7.1）：身份未建立前无法 set_config，workspace 解析走 owner 池
      const ws = await getOwnerPool().query<{ id: string; tenant_id: string }>(
        `SELECT id, tenant_id FROM workspaces WHERE slug=$1`,
        [input.workspaceSlug],
      );
      const wsRow = ws.rows[0];
      if (!wsRow) throw new TRPCError({ code: "NOT_FOUND", message: `工作区 ${input.workspaceSlug} 不存在` });
      const scope = { tenantId: wsRow.tenant_id, workspaceId: wsRow.id };
      const member = await getMember(app, scope, input.memberNo);
      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: `成员 ${input.memberNo} 不存在` });
      // 租户版本（登录引导例外点：同上走 owner 池）
      const t = await getOwnerPool().query<{ plan: Identity["plan"] }>(`SELECT plan FROM tenants WHERE id=$1`, [scope.tenantId]);
      const identity: Identity = {
        memberId: member.id,
        memberNo: member.memberNo,
        name: member.name,
        role: member.role,
        tenantId: scope.tenantId,
        workspaceId: scope.workspaceId,
        plan: t.rows[0]?.plan ?? "community",
      };
      return { token: await signDemoToken(identity), identity };
    }),
});

/** members router：me（角色+版本能力下发，F5.6 三端一致的数据源）/ list */
const membersRouter = router({
  me: protectedProcedure.query(({ ctx }) => {
    return {
      identity: ctx.identity,
      capabilities: getCapabilities(ctx.identity.plan),
    };
  }),
  list: protectedProcedure.query(async ({ ctx }) => {
    return listMembers(getAppPool(), scopeOf(ctx.identity));
  }),
});

/** threads router：list（L7.1 越权返回空）/ dispatch（Quest 接口；H-10 越版 403+留痕） */
const threadsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const scope = scopeOf(ctx.identity);
    const app = getAppPool();
    const client = await app.connect();
    try {
      await client.query("SELECT set_config('app.workspace_id', $1, false)", [scope.workspaceId]);
      await client.query("SELECT set_config('app.tenant_id', $1, false)", [scope.tenantId]);
      const r = await client.query(
        `SELECT id, title, mode, status, progress_done, progress_total, created_by, agent_id, created_at
         FROM threads WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 50`,
        [scope.workspaceId],
      );
      return r.rows;
    } finally {
      client.release();
    }
  }),

  /** Quest 派遣入口（B8：意图路由→含糊反问/建档；L3.1 并发上限；G8 留痕） */
  dispatch: capabilityProcedure("quest")
    .input(
      z.object({
        title: z.string().min(1).max(500), // F3.1：≤500 字
        presetKey: z.string().default("pricing-agent"),
        runImmediately: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = scopeOf(ctx.identity);
      // F3.2 意图路由（规则兜底；LLM 分类器在 B8 后续接 model-router）
      const intent = await routeIntent(input.title);
      if (intent.kind === "clarify") {
        // 含糊指令：反问澄清，不盲目建任务
        return { kind: "clarify" as const, question: intent.clarifyQuestion, via: intent.via };
      }
      const app = getAppPool();
      // L3.1：单工作区并发 ≤10，超出排队且可见
      const conc = await app.query<{ c: string }>(
        `SELECT count(*) AS c FROM threads WHERE workspace_id=$1 AND status IN ('queued','running')`,
        [scope.workspaceId],
      );
      if (Number(conc.rows[0]?.c ?? 0) >= MAX_CONCURRENT_THREADS) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `并发上限 ${MAX_CONCURRENT_THREADS}/工作区（L3.1/G11），已超出请稍后或排队`,
        });
      }
      const client = await app.connect();
      let threadId: string;
      try {
        await client.query("SELECT set_config('app.workspace_id', $1, false)", [scope.workspaceId]);
        await client.query("SELECT set_config('app.tenant_id', $1, false)", [scope.tenantId]);
        const max = await client.query<{ n: number }>(
          `SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\\D', '', 'g'), '')::int), 100) AS n
           FROM threads WHERE workspace_id=$1 AND id ~ '^T-\\d+$'`,
          [scope.workspaceId],
        );
        threadId = makeReadableId("T", (max.rows[0]?.n ?? 100) + 1);
        await client.query(
          `INSERT INTO threads (id, tenant_id, workspace_id, title, mode, status, created_by)
           VALUES ($1,$2,$3,$4,$5,'queued',$6)`,
          [threadId, scope.tenantId, scope.workspaceId, input.title, intent.mode, ctx.identity.memberNo],
        );
      } finally {
        client.release();
      }
      // 派遣事件留痕（G8：经网关三段瀑布；人类派遣为只读动作类，不触发写禁）
      await gatewayAppend(getGatewayPool(), {
        ...scope,
        actor: { id: ctx.identity.memberNo, type: "human" },
        sessionId: threadId,
      }, {
        who: { type: "human", id: ctx.identity.memberNo },
        context: { tenant_id: scope.tenantId, workspace_id: scope.workspaceId, time: new Date().toISOString(), channel: "inapp" },
        object: { type: "store", id: scope.workspaceId },
        decision: { action: "thread.dispatch", after: { threadId, title: input.title, mode: intent.mode, via: intent.via } },
        rule_impact: [],
      });
      // 演示驱动：立即执行 Quest 循环（生产由调度器拉取，B9）
      if (input.runImmediately && intent.mode === "quest") {
        const r = await runQuest(app, getGatewayPool(), scope, {
          threadId, goal: input.title, presetKey: input.presetKey,
        });
        return { kind: "routed" as const, mode: intent.mode, via: intent.via, threadId, status: r.status, stepsDone: r.stepsDone, stepsTotal: r.stepsTotal };
      }
      return { kind: "routed" as const, mode: intent.mode, via: intent.via, threadId, status: "queued" as const };
    }),

  /** 运行/续跑线程（replay 断点续跑幂等，E3.3/H-5；手动触发演示驱动） */
  run: capabilityProcedure("quest")
    .input(z.object({ threadId: z.string(), goal: z.string(), presetKey: z.string().default("pricing-agent") }))
    .mutation(async ({ ctx, input }) => {
      const scope = scopeOf(ctx.identity);
      return runQuest(getAppPool(), getGatewayPool(), scope, {
        threadId: input.threadId, goal: input.goal, presetKey: input.presetKey,
      });
    }),
});

/** approvals router（B6：统一队列/三手势/批量/超时扫描；L5.1 服务端强制鉴权） */
const approvalsRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.enum(["pending", "approved", "edited", "rejected", "expired"]).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return listQueue(getAppPool(), scopeOf(ctx.identity), { status: input?.status });
    }),

  decide: protectedProcedure
    .input(
      z.object({
        approvalId: z.string(),
        gesture: z.enum(["approve", "edit", "reject"]),
        reasonEnum: z.string().optional(),
        reasonText: z.string().max(200).optional(),
        editedAfter: z.unknown().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await decide(
          getAppPool(),
          getGatewayPool(),
          scopeOf(ctx.identity),
          { memberNo: ctx.identity.memberNo, role: ctx.identity.role },
          input.approvalId,
          { type: input.gesture, reasonEnum: input.reasonEnum, reasonText: input.reasonText, editedAfter: input.editedAfter },
        );
      } catch (err) {
        if (err instanceof ApprovalError) {
          throw new TRPCError({
            code: err.code === "FORBIDDEN_ROLE" ? "FORBIDDEN" : "BAD_REQUEST",
            message: err.message,
          });
        }
        throw err;
      }
    }),

  batchApprove: protectedProcedure
    .input(z.object({ approvalIds: z.array(z.string()).min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await batchApprove(
          getAppPool(),
          getGatewayPool(),
          scopeOf(ctx.identity),
          { memberNo: ctx.identity.memberNo, role: ctx.identity.role },
          input.approvalIds,
        );
      } catch (err) {
        if (err instanceof ApprovalError) {
          throw new TRPCError({ code: "FORBIDDEN", message: err.message });
        }
        throw err;
      }
    }),

  /** 超时升级扫描（F5.7；高危项不自动放行 L5.4）——由触发器/巡检调度调用 */
  sweep: protectedProcedure.mutation(async ({ ctx }) => {
    return expireSweep(getAppPool(), scopeOf(ctx.identity));
  }),
});

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  members: membersRouter,
  threads: threadsRouter,
  approvals: approvalsRouter,
});

export type AppRouter = typeof appRouter;
/** 上下文类型经 router 入口再导出（前端 AppRouter 类型可移植性，TS2742） */
export type { TrpcContext } from "./context.js";
