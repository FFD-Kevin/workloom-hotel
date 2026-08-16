/**
 * runtime · 工具执行面（F3.9 五级分层：首版走 L3 确定性剧本——生产主路径）
 * 每个工具产出 { result, receipt }；receipt 是「回执位」（L3.6/E3.7）：
 * 关键数字必须来自工具回执，无回执标「未核实」不得宣称完成。
 * 首版工具为确定性演示剧本（真实 PMS/OTA 适配器进 L1/L2 层，触发条件见总纲 §7）。
 */

export interface ToolReceipt {
  synced: boolean;
  snapshot_uri?: string;
  verified_at?: string;
}

export interface ToolResult {
  result: Record<string, unknown>;
  receipt: ToolReceipt;
}

export type ToolFn = (params: Record<string, unknown>) => Promise<ToolResult>;

const ok = (result: Record<string, unknown>): ToolResult => ({
  result,
  receipt: { synced: true, snapshot_uri: `data/snapshots/${Date.now().toString(36)}.png`, verified_at: new Date().toISOString() },
});

/** 确定性剧本工具表（云栖酒店演示口径；数字与种子剧本一致） */
export const DEMO_TOOLS: Record<string, ToolFn> = {
  "pms.price.read": async (p) => ok({ room_type: p.room_type ?? "RT-DLX-KING", current: 458, occ_7d: 0.78 }),
  "pms.price.write": async (p) => ok({ room_type: p.room_type, price: p.price, applied: true }),
  "ota.price.write": async (p) => ok({ channel: p.channel ?? "美团", price: p.price, applied: true }),
  "competitor.fetch": async () => ok({ card: "西湖云舍酒店", price: 472, ts: new Date().toISOString() }),
  "review.list": async () => ok({ fresh: [{ id: "RV-66413", rating: 2, channel: "携程", text: "空调异响影响睡眠" }] }),
  "review.reply": async (p) => ok({ review_id: p.review_id, published: true }),
  "order.list": async () => ok({ count: 37, total: 18234.5 }),
  "order.reconcile": async () => ok({ diff: 0, rounds: 3 }),
  "refund.apply": async (p) => ok({ order_id: p.order_id, amount: p.amount, refunded: true }),
  "content.draft": async (p) => ok({ title: p.title ?? "秋日云栖套餐", draft_id: `CT-${Date.now().toString(36)}` }),
  "content.publish": async (p) => ok({ title: p.title, published: true }),
};

export async function executeTool(name: string, params: Record<string, unknown>): Promise<ToolResult> {
  const fn = DEMO_TOOLS[name];
  if (!fn) throw new Error(`工具 ${name} 未注册（演示面只含 L3 确定性剧本工具）`);
  return fn(params);
}
