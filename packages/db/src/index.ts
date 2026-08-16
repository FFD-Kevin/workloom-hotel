import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

export * from './schema'

const DEFAULT_URL = 'postgres://workloom:workloom@localhost:5432/workloom'

let pool: Pool | undefined

/** 单例连接池；RLS 的 app.workspace_id 由应用层按请求 SET（Phase 2 实现上下文中间件） */
export function createDb(url = process.env.DATABASE_URL ?? DEFAULT_URL) {
  pool ??= new Pool({ connectionString: url })
  return drizzle(pool)
}

export type Db = ReturnType<typeof createDb>
