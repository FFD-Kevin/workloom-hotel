/**
 * tRPC client（v11，httpBatchLink；类型由 @workloom/server 端到端推导——总纲 §2.4）
 * 轮询口径在阶段三落地（线程/夜班 5s，其余 10–15s，F3.4/D6）
 */
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@workloom/server/router";

export const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "/trpc" })],
});
