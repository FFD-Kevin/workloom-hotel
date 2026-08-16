import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '@workloom/server/trpc'

/** 经 Vite 代理访问 server（/trpc → :8787），免 CORS */
export const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: '/trpc' })],
})
