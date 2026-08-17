/**
 * 安全审计回归（F12 全局收尾补登）：
 *  - H-11 凭据不出现在任何提示词与事件明文（L7.3：只记引用 ID）——全库扫描
 *  - H-13 脱敏失败批次被拦截（E1.3：不降级原文上行）——注入对抗
 *  - E1.3 正向：PII 命中 → 事件落库为占位符而非明文（铁律 1 脱敏段实效）
 */
import { describe, expect, it } from "vitest";

const RUN_DB = process.env.RUN_DB_TESTS === "1" && !!process.env.DATABASE_APP_URL;
describe.runIf(RUN_DB)("安全审计 PG 集成（附录 H）", async () => {
  const pg = await import("pg");
  const { gatewayAppend } = await import("./gateway.js");
  const app = new pg.default.Pool({ connectionString: process.env.DATABASE_APP_URL });
  const gw = new pg.default.Pool({ connectionString: process.env.DATABASE_GATEWAY_URL });
  const scope = { tenantId: "tenant-demo", workspaceId: "ws-yunqi" };

  it("H-11：全部事件 payload / Agent 提示词 / 技能正文均不含凭据密文（只记引用 ID）", async () => {
    const client = await app.connect();
    try {
      await client.query("SELECT set_config('app.workspace_id', $1, false)", [scope.workspaceId]);
      await client.query("SELECT set_config('app.tenant_id', $1, false)", [scope.tenantId]);
      const creds = await client.query<{ id: string; secret_enc: string }>(
        `SELECT id, secret_enc FROM credentials WHERE workspace_id=$1`, [scope.workspaceId]);
      expect(creds.rows.length).toBeGreaterThan(0);

      const events = await client.query<{ event_id: string; payload: unknown }>(
        `SELECT event_id, payload FROM biz_events WHERE workspace_id=$1`, [scope.workspaceId]);
      const agents = await client.query<{ id: string; meta: unknown }>(
        `SELECT id, meta FROM agents WHERE workspace_id=$1`, [scope.workspaceId]);
      const skills = await client.query<{ id: string; body: string }>(`SELECT id, body FROM skills`);

      for (const c of creds.rows) {
        for (const e of events.rows) {
          expect(JSON.stringify(e.payload), `事件 ${e.event_id} 含凭据 ${c.id} 密文`).not.toContain(c.secret_enc);
        }
        for (const a of agents.rows) {
          expect(JSON.stringify(a.meta), `Agent ${a.id} 提示词含凭据密文`).not.toContain(c.secret_enc);
        }
        for (const s of skills.rows) {
          expect(s.body, `技能 ${s.id} 正文含凭据密文`).not.toContain(c.secret_enc);
        }
      }
      // 字段名层面的明文出口也不允许出现
      for (const e of events.rows) {
        expect(JSON.stringify(e.payload)).not.toContain("secret_enc");
      }
    } finally {
      client.release();
    }
  });

  it("H-13：不可序列化/敌对 payload 被拒写且不降级原文上行（注入对抗）", async () => {
    const marker = `h13-hostile-${Date.now().toString(36)}`;
    await expect(
      gatewayAppend(gw, { ...scope, actor: { id: "MEM-001", type: "human" } }, {
        who: { type: "human", id: "MEM-001" },
        context: { tenant_id: scope.tenantId, workspace_id: scope.workspaceId, time: new Date().toISOString(), channel: "inapp" },
        object: { type: "store", id: marker },
        // BigInt 不可 JSON 序列化——模拟脱敏/编码失败批次
        decision: { action: "audit.probe", after: { bad: BigInt(1) } as never },
        rule_impact: [],
      }),
    ).rejects.toThrow();
    // 拦截后事件库无原文（不降级上行）
    const r = await gw.query(`SELECT 1 FROM biz_events WHERE payload::text LIKE $1`, [`%${marker}%`]);
    expect(r.rows.length).toBe(0);
  });

  it("E1.3 正向：PII 明文经脱敏段落库为占位符（铁律 1 实效）", async () => {
    const phone = "13912345678";
    const r = await gatewayAppend(gw, { ...scope, actor: { id: "MEM-001", type: "human" } }, {
      who: { type: "human", id: "MEM-001" },
      context: { tenant_id: scope.tenantId, workspace_id: scope.workspaceId, time: new Date().toISOString(), channel: "inapp" },
      object: { type: "guest", id: `h13-pii-${Date.now().toString(36)}` },
      decision: { action: "audit.pii_probe", after: { contact: `客人电话 ${phone}` } },
      rule_impact: [],
    });
    expect(r.piiHits).toBeGreaterThan(0);
    const row = await app.query<{ payload: string }>(
      `SELECT payload::text AS payload FROM biz_events WHERE event_id=$1`, [r.eventId]);
    expect(row.rows[0]!.payload).not.toContain(phone);
    expect(row.rows[0]!.payload).toContain("[PII:PHONE:");
  });
});
