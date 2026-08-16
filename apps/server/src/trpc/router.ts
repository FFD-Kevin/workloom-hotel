// tRPC 根 router（接口层聚合点；Phase 2 起按 modules/ 逐个挂载子 router）
import { initTRPC } from '@trpc/server'
import { sql } from 'drizzle-orm'
import { createDb } from '@workloom/db'

const t = initTRPC.create()

export const appRouter = t.router({
  ping: t.procedure.query(() => 'pong'),
  meta: t.procedure.query(() => ({
    name: '小WorkLoom',
    product: '企业智能执行中枢',
    prd: 'V3.0',
    phase: '1-环境初始化',
  })),
  dbHealth: t.procedure.query(async () => {
    await createDb().execute(sql`select 1`)
    return { ok: true }
  }),
})

export type AppRouter = typeof appRouter
