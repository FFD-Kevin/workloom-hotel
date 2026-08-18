/**
 * B1 测试：纯函数单测（PII/权限段/高风险段/哈希链规范化）+ PG 集成（幂等/链序/门禁）
 * 集成用例仅在 RUN_DB_TESTS=1 且 DATABASE_GATEWAY_URL 可达时运行（CI/沙箱实测口径），
 * 否则自动跳过——单元用例永远全量跑。
 */
import { describe, expect, it } from "vitest";
import { maskDeep, maskText } from "./pii.js";
import { checkHighRiskAuthorization, checkPermission, GatewayReject, isWriteAction } from "./gateway.js";
import { canonicalJson, eventHash, GENESIS_HASH } from "./events.js";

const draft = (action: string) => ({
  who: { type: "agent" as const, id: "pricing-agent", version: "v2.3" },
  context: { tenant_id: "tenant-demo", workspace_id: "ws-yunqi", time: "2026-08-16T22:10:00+08:00" },
  object: { type: "room_price", id: "RT-DLX-KING" },
  decision: { action },
  rule_impact: [],
});

describe("PII 脱敏（瀑布段②）", () => {
  it("手机号/身份证/邮箱命中占位符协议，同值同占位", () => {
    const a = maskText("客人电话 13812345678，邮箱 a.b@c.com");
    expect(a.hits).toBe(2);
    expect(a.text).not.toContain("13812345678");
    expect(a.text).toMatch(/\[PII:PHONE:[0-9a-f]{8}\]/);
    const b = maskText("回访 13812345678");
    // 同值同占位（可关联、无明文）
    expect(b.text).toContain(a.text.match(/\[PII:PHONE:[0-9a-f]{8}\]/)![0]);
  });

  it("身份证号优先于银行卡，不误伤价格数字", () => {
    const r = maskText("身份证 110101199003077758，担保卡 6222021001114329，退款金额 500");
    expect(r.text).toContain("[PII:IDCARD:");
    expect(r.text).toContain("退款金额 500"); // 纯业务数字不误伤
  });

  it("maskDeep 递归到嵌套叶子", () => {
    const r = maskDeep({ decision: { after: { note: "联系 13900001111" }, basis: ["OCC 0.78"] } });
    expect(r.hits).toBe(1);
    expect(JSON.stringify(r.value)).not.toContain("13900001111");
  });
});

describe("权限段①（F2.10/L9.1 复查位）", () => {
  it("未声明 fence_bindings 的 Agent 写动作被拒", () => {
    expect(() =>
      checkPermission({ id: "rogue", type: "agent", fenceBindings: [] }, draft("price.adjust")),
    ).toThrow(GatewayReject);
  });

  it("只读 preset 写动作被拒（L9.1）", () => {
    expect(() =>
      checkPermission({ id: "inspection-agent", type: "agent", readonly: true, fenceBindings: [] }, draft("price.adjust")),
    ).toThrow(/L9\.1/);
  });

  it("声明了围栏的 Agent 写动作放行；只读动作不受限", () => {
    expect(() =>
      checkPermission({ id: "pricing-agent", type: "agent", fenceBindings: ["R1", "R2"] }, draft("price.adjust")),
    ).not.toThrow();
    expect(() => checkPermission({ id: "inspection-agent", type: "agent", readonly: true }, draft("inspection.scan"))).not.toThrow();
  });
});

describe("高风险授权段③（L3.5）", () => {
  it("高危 Agent 写动作缺授权引用被拒，带引用放行", () => {
    const desktop = { id: "desktop-agent", type: "agent" as const, highRisk: true, fenceBindings: ["R2"] };
    expect(() => checkHighRiskAuthorization(desktop, draft("desktop.gui"))).toThrow(/L3\.5/);
    expect(() => checkHighRiskAuthorization(desktop, draft("desktop.gui"), "apr-e-8888")).not.toThrow();
  });
});

describe("哈希链工具", () => {
  it("canonicalJson 键序稳定", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
  });
  it("eventHash 确定性", () => {
    expect(eventHash(GENESIS_HASH, { x: 1 })).toBe(eventHash(GENESIS_HASH, { x: 1 }));
    expect(eventHash(GENESIS_HASH, { x: 1 })).not.toBe(eventHash(GENESIS_HASH, { x: 2 }));
  });
  it("写类动作判定", () => {
    expect(isWriteAction("price.adjust")).toBe(true);
    expect(isWriteAction("inspection.scan")).toBe(false);
  });
});

/* ================= PG 集成（RUN_DB_TESTS=1 时启用） ================= */

const RUN_DB = process.env.RUN_DB_TESTS === "1" && !!process.env.DATABASE_GATEWAY_URL;
const d = RUN_DB ? describe : describe.skip;

d("PG 集成（H-2/L1.4：幂等丢弃、哈希链序）", async () => {
  const pg = (await import("pg")).default;
  const { gatewayAppend, gatewayAppendIdempotent } = await import("./gateway.js");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_GATEWAY_URL });
  const scope = { tenantId: "tenant-demo", workspaceId: "ws-yunqi" };
  const ctx = { ...scope, actor: { id: "pricing-agent", type: "agent" as const, fenceBindings: ["R1", "R2"] } };

  /** 读侧辅助：RLS 要求会话级 workspace 上下文（L7.1），否则返回空 */
  const readEvent = async (eventId: string) => {
    const c = await pool.connect();
    try {
      await c.query("SELECT set_config('app.workspace_id', $1, false)", [scope.workspaceId]);
      const r = await c.query("SELECT prev_hash, hash, payload FROM biz_events WHERE tenant_id=$1 AND event_id=$2", [scope.tenantId, eventId]);
      return r.rows[0];
    } finally {
      c.release();
    }
  };

  it("网关落库 → 事件编号续接 + 哈希链推进", async () => {
    const r = await gatewayAppend(pool, ctx, draft("price.adjust"));
    expect(r.eventId).toMatch(/^E-\d+$/);
    expect(r.deduped).toBe(false);
    const row = await readEvent(r.eventId);
    expect(row.hash).toBe(r.hash);
  });

  it("重复 event_id 写入幂等丢弃不报错（L1.4）", async () => {
    const ev = { ...draft("price.adjust"), event_id: "E-8801" } as const;
    // E-8801 为种子事件，重复写入必须 deduped=true 且不抛错
    const r = await gatewayAppendIdempotent(pool, ctx, ev as never);
    expect(r.deduped).toBe(true);
    expect(r.eventId).toBe("E-8801");
  });

  it("脱敏落库：事件库无明文手机号（F1.10 机制位）", async () => {
    const r = await gatewayAppend(pool, ctx, {
      ...draft("price.adjust"),
      decision: { action: "price.adjust", after: { note: "客人 13812345678 要求保留房价" } },
    });
    const row = await readEvent(r.eventId);
    expect(JSON.stringify(row.payload)).not.toContain("13812345678");
    expect(JSON.stringify(row.payload)).toContain("[PII:PHONE:");
    expect(r.piiHits).toBe(1);
  });
});
