// Hono 入口：/trpc 挂载 tRPC（fetch adapter）；/im/callback 等原生路由 Phase 2/4 加入
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { sql } from 'drizzle-orm'
import { createDb } from '@workloom/db'
import { appRouter } from './trpc/router'

const app = new Hono()

app.use('/trpc/*', cors({ origin: ['http://localhost:5173'] }))
app.use('/trpc/*', (c) =>
  fetchRequestHandler({
    endpoint: '/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext: () => ({}),
  }),
)

app.get('/health', async (c) => {
  let db = false
  try {
    await createDb().execute(sql`select 1`)
    db = true
  } catch {
    /* db 未就绪 */
  }
  return c.json({ ok: true, service: 'workloom-server', db })
})

const port = Number(process.env.PORT ?? 8787)
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[workloom-server] listening on http://localhost:${info.port}`)
})
