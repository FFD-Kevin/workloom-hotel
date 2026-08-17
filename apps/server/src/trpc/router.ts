/**
 * tRPC 根路由（B10 状态：system / auth / members / threads / approvals / inspection / skills 挂载；
 * 其余 router（events / fence / bundle）后续按需要挂载——见 MASTERPLAN §2.2）
 * 已挂载：B10 inspection（巡检 M9）/ skills（技能+意识 M8）；F3 workspace（档案/成员）/ nightShift（夜班投影）
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
import { NightTransitionError, pauseAll, resumeNight } from "@workloom/base/night-shift";
import { confirmDryRun, createDryRun } from "@workloom/base/fence-engine";
import { MAX_CONCURRENT_THREADS } from "@workloom/shared";
import {
  dispatchFromAnomaly,
  DispatchError,
  inspectionStatusBar,
  resolveAnomaly,
  runInspectionScan,
} from "@workloom/base/inspection";
import {
  confirmSuggestion,
  createSkillDraft,
  detectSuggestions,
  dryRunSkill,
  installSkill,
  listInstalls,
  listSkills,
  rejectSuggestion,
  SkillError,
  uninstallSkill,
} from "@workloom/base/skills";

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

  /** 线程详情（P2 线程头/信息面板；L7.1 越权返回空） */
  get: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ ctx, input }) => {
      const scope = scopeOf(ctx.identity);
      const app = getAppPool();
      const client = await app.connect();
      try {
        await client.query("SELECT set_config('app.workspace_id', $1, false)", [scope.workspaceId]);
        const r = await client.query(
          `SELECT id, title, mode, status, progress_done, progress_total, created_by, agent_id, created_at, updated_at
           FROM threads WHERE workspace_id=$1 AND id=$2`,
          [scope.workspaceId, input.threadId],
        );
        return r.rows[0] ?? null;
      } finally {
        client.release();
      }
    }),

  /** 行动消息流（P2-⑤：该线程的事件流子序列投影，按 ts 升序；含 rule_impact/model_trace 渲染位） */
  events: protectedProcedure
    .input(z.object({ threadId: z.string(), limit: z.number().min(1).max(200).default(100) }))
    .query(async ({ ctx, input }) => {
      const scope = scopeOf(ctx.identity);
      const app = getAppPool();
      const client = await app.connect();
      try {
        await client.query("SELECT set_config('app.workspace_id', $1, false)", [scope.workspaceId]);
        await client.query("SELECT set_config('app.tenant_id', $1, false)", [scope.tenantId]);
        const r = await client.query<{ payload: unknown }>(
          `SELECT payload FROM biz_events
           WHERE workspace_id=$1 AND session_id=$2 ORDER BY seq ASC LIMIT $3`,
          [scope.workspaceId, input.threadId, input.limit],
        );
        return r.rows.map((x) => x.payload);
      } finally {
        client.release();
      }
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

/** inspection router（B10/M9：巡检状态条 / 手动巡检 / 一键派单 / 回链） */
const inspectionRouter = router({
  /** 巡检状态条（F9.4 纯投影：正常项/总数 + 最近巡检时间 + 异常点名 ≤5 条） */
  status: protectedProcedure.query(async ({ ctx }) => {
    return inspectionStatusBar(getAppPool(), scopeOf(ctx.identity));
  }),
  /** 手动跑一轮巡检（生产由触发器引擎 cron 07:00 唤起，F9.1；演示手动触发） */
  run: protectedProcedure.mutation(async ({ ctx }) => {
    return runInspectionScan(getAppPool(), getGatewayPool(), scopeOf(ctx.identity));
  }),
  /** 一键派单（F9.3：以异常事件为输入唤起业务 Agent；幂等 L9.3） */
  dispatch: protectedProcedure
    .input(z.object({ anomalyEventId: z.string(), presetKey: z.string().default("review-agent") }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await dispatchFromAnomaly(getAppPool(), getGatewayPool(), scopeOf(ctx.identity), {
          anomalyEventId: input.anomalyEventId, presetKey: input.presetKey, by: ctx.identity.memberNo,
        });
      } catch (err) {
        if (err instanceof DispatchError) {
          throw new TRPCError({ code: err.code === "ANOMALY_NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST", message: err.message });
        }
        throw err;
      }
    }),
  /** 处理结果回链（F9.3/E9.3：失败升级一级严重度 + 转需介入） */
  resolve: protectedProcedure
    .input(z.object({ anomalyEventId: z.string(), threadId: z.string(), ok: z.boolean(), note: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await resolveAnomaly(getAppPool(), getGatewayPool(), scopeOf(ctx.identity), {
          ...input, by: ctx.identity.memberNo,
        });
      } catch (err) {
        if (err instanceof DispatchError) {
          throw new TRPCError({ code: err.code === "ANOMALY_NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST", message: err.message });
        }
        throw err;
      }
    }),
});

/** skills router（B10/M8：技能广场 / 安装绑定 / 零代码锻造 / 意识系统） */
const skillsRouter = router({
  list: protectedProcedure
    .input(z.object({ level: z.enum(["official", "team", "industry"]).optional() }).optional())
    .query(async ({ input }) => listSkills(getAppPool(), { level: input?.level })),
  installs: protectedProcedure.query(async ({ ctx }) => {
    return listInstalls(getAppPool(), scopeOf(ctx.identity));
  }),
  /** 安装（F8.2 安装即绑定；L8.1 脱敏闸 / L8.2 白名单 / E8.1 冲突进审批 / F8.3 dry-run 前置） */
  install: protectedProcedure
    .input(z.object({ skillId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await installSkill(getAppPool(), getGatewayPool(), scopeOf(ctx.identity), {
          skillId: input.skillId, by: ctx.identity.memberNo,
        });
      } catch (err) {
        if (err instanceof SkillError) {
          throw new TRPCError({ code: err.code === "NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST", message: err.message });
        }
        throw err;
      }
    }),
  /** 卸载（L8.3 卸载即撤销围栏绑定） */
  uninstall: protectedProcedure
    .input(z.object({ skillId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await uninstallSkill(getAppPool(), getGatewayPool(), scopeOf(ctx.identity), {
          skillId: input.skillId, by: ctx.identity.memberNo,
        });
      } catch (err) {
        if (err instanceof SkillError) {
          throw new TRPCError({ code: err.code === "NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST", message: err.message });
        }
        throw err;
      }
    }),
  /** 零代码自定义技能草稿（F8.3 三要素；生成物进版本管理） */
  forge: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).default(""),
      triplet: z.object({ trigger: z.string().min(1), steps: z.array(z.string().min(1)).min(1), boundary: z.string().min(1) }),
      fenceBindings: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return createSkillDraft(getAppPool(), getGatewayPool(), scopeOf(ctx.identity), { ...input, by: ctx.identity.memberNo });
    }),
  /** 生效前 dry-run 预览（F8.3/F2.5：回放最近 10 条） */
  dryRun: protectedProcedure
    .input(z.object({ skillId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await dryRunSkill(getAppPool(), getGatewayPool(), scopeOf(ctx.identity), {
          skillId: input.skillId, by: ctx.identity.memberNo,
        });
      } catch (err) {
        if (err instanceof SkillError) {
          throw new TRPCError({ code: "NOT_FOUND", message: err.message });
        }
        throw err;
      }
    }),
  awareness: router({
    /** 高频相似任务检测（F8.4：≥3 次/周建议固化；E8.3 驳回校准） */
    suggestions: protectedProcedure.query(async ({ ctx }) => {
      return detectSuggestions(getAppPool(), scopeOf(ctx.identity));
    }),
    /** 一键确认 → 生成触发器或新技能（F8.4） */
    confirm: protectedProcedure
      .input(z.object({
        suggestion: z.object({
          key: z.string(), objectType: z.string(), actionCategory: z.string(),
          count: z.number(), windowDays: z.number(), threshold: z.number(), sampleEventIds: z.array(z.string()),
        }),
        target: z.enum(["trigger", "skill"]),
        schedule: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return confirmSuggestion(getAppPool(), getGatewayPool(), scopeOf(ctx.identity), {
          suggestion: input.suggestion, target: input.target, schedule: input.schedule, by: ctx.identity.memberNo,
        });
      }),
    /** 驳回建议（E8.3 校准闭环：该类阈值 ×2） */
    reject: protectedProcedure
      .input(z.object({ key: z.string(), reason: z.string().max(200).optional() }))
      .mutation(async ({ ctx, input }) => {
        return { eventId: await rejectSuggestion(getGatewayPool(), scopeOf(ctx.identity), { ...input, by: ctx.identity.memberNo }) };
      }),
  }),
});

/** workspace router（F3 起 P1 右栏数据源：一店一档投影 + 人机混编在线成员） */
const workspaceRouter = router({
  /** 一店一档投影（档案 chips：property/audience/history_curve 等；L7.1 越权空） */
  profile: protectedProcedure.query(async ({ ctx }) => {
    const scope = scopeOf(ctx.identity);
    const app = getAppPool();
    const client = await app.connect();
    try {
      await client.query("SELECT set_config('app.workspace_id', $1, false)", [scope.workspaceId]);
      await client.query("SELECT set_config('app.tenant_id', $1, false)", [scope.tenantId]);
      const p = await client.query<{ archive: Record<string, unknown> }>(
        `SELECT archive FROM profiles WHERE workspace_id=$1`, [scope.workspaceId],
      );
      const w = await client.query<{ stage: string | null; name: string }>(
        `SELECT stage, name FROM workspaces WHERE id=$1`, [scope.workspaceId],
      );
      return { archive: p.rows[0]?.archive ?? {}, stage: w.rows[0]?.stage ?? null, name: w.rows[0]?.name ?? "" };
    } finally {
      client.release();
    }
  }),
  /** 人机混编在线成员（P1E6：Agent 夜班窗口内自动上线 M4；状态来自 agents.status） */
  agents: protectedProcedure.query(async ({ ctx }) => {
    const scope = scopeOf(ctx.identity);
    const app = getAppPool();
    const client = await app.connect();
    try {
      await client.query("SELECT set_config('app.workspace_id', $1, false)", [scope.workspaceId]);
      const r = await client.query<{
        id: string; preset_key: string; name: string; version: string; kind: string;
        readonly: boolean; status: string; meta: { night_shift?: boolean };
      }>(
        `SELECT id, preset_key, name, version, kind, readonly, status, meta
         FROM agents WHERE workspace_id=$1 ORDER BY preset_key`,
        [scope.workspaceId],
      );
      return r.rows;
    } finally {
      client.release();
    }
  }),
});

/** nightShift router（F3 起 P1 数据源：夜班状态胶囊 + 昨夜战报卡投影） */
const nightShiftRouter = router({
  /** 最近班次 + 状态机投影（F4.8）+ 决策包统计（F4.4，deliverPackage 回写的 stats） */
  current: protectedProcedure.query(async ({ ctx }) => {
    const scope = scopeOf(ctx.identity);
    const app = getAppPool();
    const client = await app.connect();
    try {
      await client.query("SELECT set_config('app.workspace_id', $1, false)", [scope.workspaceId]);
      const r = await client.query<{
        id: string; status: string; run_date: string; fence_snapshot_version: string | null;
        candidate_count: number; started_at: Date | null;
        stats: { done: number; pending: number; need_human: number; credits_used: number } | null;
      }>(
        `SELECT id, status, run_date, fence_snapshot_version, candidate_count, started_at, stats
         FROM night_runs WHERE workspace_id=$1 ORDER BY run_date DESC LIMIT 1`,
        [scope.workspaceId],
      );
      const row = r.rows[0];
      if (!row) return { configured: false as const };
      return {
        configured: true as const,
        run: {
          id: row.id, status: row.status, runDate: row.run_date,
          fenceSnapshot: row.fence_snapshot_version, candidateCount: row.candidate_count,
          startedAt: row.started_at?.toISOString() ?? null, stats: row.stats,
        },
      };
    } finally {
      client.release();
    }
  }),

  /** 班组消息流（P9E1：夜班频道事件流投影，ts 升序；夜班动作 100% 过围栏 L4.1） */
  events: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(80) }).optional())
    .query(async ({ ctx, input }) => {
      const scope = scopeOf(ctx.identity);
      const app = getAppPool();
      const client = await app.connect();
      try {
        await client.query("SELECT set_config('app.workspace_id', $1, false)", [scope.workspaceId]);
        await client.query("SELECT set_config('app.tenant_id', $1, false)", [scope.tenantId]);
        const r = await client.query<{ payload: unknown }>(
          `SELECT payload FROM biz_events
           WHERE workspace_id=$1 AND payload->'context'->>'channel' = '夜班'
           ORDER BY seq DESC LIMIT $2`,
          [scope.workspaceId, input?.limit ?? 80],
        );
        return r.rows.map((x) => x.payload).reverse(); // ts 升序
      } finally {
        client.release();
      }
    }),

  /** 一键暂停（P9E2：二次确认在组件层；G5 端到端计时留痕；超时 P0 升级 E4.1） */
  pause: protectedProcedure
    .input(z.object({ runId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await pauseAll(getAppPool(), getGatewayPool(), scopeOf(ctx.identity), input.runId, {
          memberNo: ctx.identity.memberNo, channel: "inapp",
        });
      } catch (err) {
        if (err instanceof NightTransitionError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
        }
        throw err;
      }
    }),

  /** 恢复（E4.2：断点续跑由 runtime replay 保证） */
  resume: protectedProcedure
    .input(z.object({ runId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await resumeNight(getAppPool(), getGatewayPool(), scopeOf(ctx.identity), input.runId, ctx.identity.memberNo);
      return { ok: true };
    }),

  /** 班组留言（P9E6：人给班组留言=五元事件留痕；触发的动作照常过围栏 L4.1/L4.4） */
  note: protectedProcedure
    .input(z.object({ text: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const scope = scopeOf(ctx.identity);
      const r = await gatewayAppend(getGatewayPool(), {
        ...scope, actor: { id: ctx.identity.memberNo, type: "human" },
      }, {
        who: { type: "human", id: ctx.identity.memberNo },
        context: { tenant_id: scope.tenantId, workspace_id: scope.workspaceId, time: new Date().toISOString(), channel: "夜班" },
        object: { type: "store", id: scope.workspaceId },
        decision: { action: "night.note", after: { text: input.text } },
        rule_impact: [],
      });
      return { eventId: r.eventId };
    }),
});

/** fence router（F8 起 P5 数据源：规则版本化投影 + 30 天触发聚合 + dry-run 生命周期 F2.4/F2.5） */
const fenceRouter = router({
  /** 规则列表（P5E2：级别 pill + 来源 + 30 天触发数；基线 🔒 集团强制 F2.3） */
  rules: protectedProcedure.query(async ({ ctx }) => {
    const scope = scopeOf(ctx.identity);
    const app = getAppPool();
    const client = await app.connect();
    try {
      await client.query("SELECT set_config('app.workspace_id', $1, false)", [scope.workspaceId]);
      await client.query("SELECT set_config('app.tenant_id', $1, false)", [scope.tenantId]);
      const r = await client.query(
        `SELECT f.id, f.rule_id, f.version, f.workspace_id, f.name, f.level, f.match_spec,
                f.is_baseline, f.status, f.created_by, f.created_at,
                (SELECT count(*) FROM biz_events e
                  WHERE e.workspace_id=$1 AND e.created_at > now() - interval '30 days'
                    AND EXISTS (SELECT 1 FROM jsonb_array_elements(e.payload->'rule_impact') ri
                                WHERE ri->>'rule_id' = f.rule_id)) AS hits30
         FROM fence_rules f
         WHERE (f.workspace_id=$1 OR f.workspace_id='*') AND f.status IN ('active','pending_approval','draft')
         ORDER BY f.rule_id, f.created_at DESC`,
        [scope.workspaceId],
      );
      return r.rows;
    } finally {
      client.release();
    }
  }),

  /** 版本历史（P5E1：active/rolled_back/出厂基线 🔒；单调守卫 L2.1） */
  versions: protectedProcedure.query(async ({ ctx }) => {
    const scope = scopeOf(ctx.identity);
    const app = getAppPool();
    const client = await app.connect();
    try {
      await client.query("SELECT set_config('app.workspace_id', $1, false)", [scope.workspaceId]);
      const r = await client.query(
        `SELECT version, status, count(*) AS rules, min(created_at) AS created_at
         FROM fence_rules WHERE (workspace_id=$1 OR workspace_id='*')
         GROUP BY version, status ORDER BY min(created_at) DESC`,
        [scope.workspaceId],
      );
      return r.rows;
    } finally {
      client.release();
    }
  }),

  /** NL 新增群规 dry-run（P5E3/P5E4：候选规则回放最近 10 条 F2.5；未确认不生效 L2.4） */
  dryRun: protectedProcedure
    .input(z.object({
      ruleId: z.string().regex(/^R\d+$/),
      name: z.string().min(1).max(100),
      level: z.enum(["auto", "review", "block"]),
      objectTypes: z.array(z.string()).min(1),
      actions: z.array(z.string()).min(1),
      when: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const scope = scopeOf(ctx.identity);
      return createDryRun(getAppPool(), scope, {
        ruleId: input.ruleId,
        ruleVersion: "v-next",
        rules: [{
          rule_id: input.ruleId, version: "v-next", name: input.name, level: input.level,
          is_baseline: false, objectTypes: input.objectTypes, actions: input.actions, when: input.when,
        }],
        defaultLevel: "review",
        createdBy: ctx.identity.memberNo,
      });
    }),

  /** 确认 dry-run（人看过报告才激活 L2.4）→ 规则进 pending_approval + 变更审批（F2.4，走 P4 决断流） */
  confirmDryRun: protectedProcedure
    .input(z.object({
      dryRunId: z.string(),
      rule: z.object({
        ruleId: z.string(), name: z.string(), level: z.enum(["auto", "review", "block"]),
        objectTypes: z.array(z.string()), actions: z.array(z.string()), when: z.string(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const scope = scopeOf(ctx.identity);
      await confirmDryRun(getAppPool(), scope, input.dryRunId);
      // 规则草稿进 pending_approval（激活须审批事件 ID，activateRuleVersion 在 P4 手势后调用——E1 联调卡）
      const app = getAppPool();
      const client = await app.connect();
      try {
        await client.query("SELECT set_config('app.workspace_id', $1, false)", [scope.workspaceId]);
        const rowId = `fr-${input.rule.ruleId.toLowerCase()}-vnext-${scope.workspaceId}`;
        await client.query(
          `INSERT INTO fence_rules (id, rule_id, version, workspace_id, name, level, match_spec, action, is_baseline, status, created_by)
           VALUES ($1,$2,'v-next',$3,$4,$5,$6,$7,false,'pending_approval',$8)
           ON CONFLICT (id) DO NOTHING`,
          [rowId, input.rule.ruleId, scope.workspaceId, input.rule.name, input.rule.level,
           JSON.stringify({ object_types: input.rule.objectTypes, actions: input.rule.actions, when: input.rule.when }),
           JSON.stringify({ result: input.rule.level }), ctx.identity.memberNo],
        );
      } finally {
        client.release();
      }
      const ev = await gatewayAppend(getGatewayPool(), {
        ...scope, actor: { id: ctx.identity.memberNo, type: "human" },
      }, {
        who: { type: "human", id: ctx.identity.memberNo },
        context: { tenant_id: scope.tenantId, workspace_id: scope.workspaceId, time: new Date().toISOString(), channel: "inapp" },
        object: { type: "staff", id: input.rule.ruleId },
        decision: { action: "fence.rule.propose", after: { ...input.rule, dryRunId: input.dryRunId } },
        rule_impact: [],
      });
      return { proposed: true, eventId: ev.eventId };
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  members: membersRouter,
  threads: threadsRouter,
  approvals: approvalsRouter,
  inspection: inspectionRouter,
  skills: skillsRouter,
  workspace: workspaceRouter,
  nightShift: nightShiftRouter,
  fence: fenceRouter,
});

export type AppRouter = typeof appRouter;
/** 上下文类型经 router 入口再导出（前端 AppRouter 类型可移植性，TS2742） */
export type { TrpcContext } from "./context.js";
