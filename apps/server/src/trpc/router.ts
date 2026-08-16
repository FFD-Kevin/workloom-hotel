/**
 * tRPC 根路由（A6 最小入口；11 个业务 router 在阶段二 B1–B10 逐卡挂载：
 * events / fence / approvals / threads / nightShift / inspection / skills
 * / members / tenancy / bundle / system）
 * 本文件同时是前端类型源：apps/web 经 `@workloom/server/router` 导入 AppRouter 类型（tRPC v11 端到端）。
 */
import { initTRPC } from "@trpc/server";
import { getAppPool } from "@workloom/db";

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

/** system router：健康检查与实例信息（A6 验收：tRPC 握手 200） */
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
      phase: "阶段一 环境初始化（A6）",
      db,
      time: new Date().toISOString(),
    };
  }),
});

export const appRouter = router({
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
