// 演示数据 seed（幂等，可重复执行）：杭州湖滨店工作区 + 成员 + 数字员工 + 基线/门店规则
import pg from 'pg'

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL ?? 'postgres://workloom:workloom@localhost:5432/workloom',
})
await client.connect()

await client.query(
  `INSERT INTO workspaces (slug, name) VALUES ('hz-hubin', '杭州湖滨店') ON CONFLICT (slug) DO NOTHING`,
)
const wsId: number = (
  await client.query(`SELECT id FROM workspaces WHERE slug = 'hz-hubin'`)
).rows[0].id

await client.query(
  `INSERT INTO members (workspace_id, member_no, name, role, im_openids) VALUES
     ($1, 'MEM-041', '王店长', 'admin', '{"feishu":"ou_demo_wang"}'),
     ($1, 'MEM-112', '小李', 'operator', '{"feishu":"ou_demo_li"}')
   ON CONFLICT (workspace_id, member_no) DO NOTHING`,
  [wsId],
)

await client.query(
  `INSERT INTO profiles (workspace_id, profile_type, name, version, preset, fence_bindings) VALUES
     ($1, 'agent', '调价Agent', 'v2.3',
      '{"tools":["pms.read_price","pms.write_price","ota.crawl_competitor"],"prompt":"酒店调价数字员工，涨幅超 8% 必审","archive_context":"hz-hubin"}',
      '["R1","R2","R3"]'),
     ($1, 'agent', '差评处理Agent', 'v1.8',
      '{"tools":["ota.read_reviews","ota.publish_reply"],"prompt":"差评处理数字员工，回复发布必审","archive_context":"hz-hubin"}',
      '["R5"]'),
     ($1, 'workspace', '杭州湖滨店业务档案', 'v12',
      '{"forbidden":["承诺免费房","泄露客人手机号"],"stage":"日常运营","goal":"评分≥4.6"}',
      '[]')
   ON CONFLICT (workspace_id, name, version) DO NOTHING`,
  [wsId],
)

const admin = (
  await client.query(
    `SELECT id FROM members WHERE workspace_id = $1 AND member_no = 'MEM-041'`,
    [wsId],
  )
).rows[0].id

await client.query(
  `INSERT INTO fence_rules (workspace_id, rule_key, version, name, level, source, expr, status, created_by_member_id) VALUES
     ($1, 'R1', 3, '价格涨幅 ≤8%', 'auto',  'custom',   '{"field":"price_change_pct","op":"<=","value":8}', 'active', $2),
     ($1, 'R2', 1, '保底价 ¥380',    'block', 'baseline', '{"field":"price","op":">=","value":380}',          'active', $2),
     ($1, 'R3', 1, '价格写操作必审', 'review','baseline', '{"object_type":"price","action_type":"write"}',    'active', $2),
     ($1, 'R5', 2, '差评回复发布必审','review','custom',  '{"object_type":"review_reply","action_type":"write"}','active', $2)
   ON CONFLICT (workspace_id, rule_key, version) DO NOTHING`,
  [wsId, admin],
)

const c = (t: string) =>
  client.query(`SELECT count(*)::int AS n FROM ${t} WHERE workspace_id = $1`, [wsId]).then((r) => r.rows[0].n)
console.log('seed ok:', {
  workspace: '杭州湖滨店',
  members: await c('members'),
  profiles: await c('profiles'),
  fence_rules: await c('fence_rules'),
})
await client.end()
