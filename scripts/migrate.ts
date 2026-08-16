// 手写 SQL 迁移执行器：按文件名序执行 packages/db/migrations/*.sql，幂等（_migrations 记录）
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

const url = process.env.DATABASE_URL ?? 'postgres://workloom:workloom@localhost:5432/workloom'
const dir = join(process.cwd(), 'packages/db/migrations')

const client = new pg.Client({ connectionString: url })
await client.connect()
await client.query(
  `CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
)
const done = new Set((await client.query('SELECT name FROM _migrations')).rows.map((r) => r.name))

const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
for (const f of files) {
  if (done.has(f)) {
    console.log(`  skip  ${f}`)
    continue
  }
  console.log(`  apply ${f}`)
  await client.query('BEGIN')
  try {
    await client.query(readFileSync(join(dir, f), 'utf8'))
    await client.query('INSERT INTO _migrations(name) VALUES ($1)', [f])
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  }
}
await client.end()
console.log(`migrations ok (${files.length} file(s))`)
