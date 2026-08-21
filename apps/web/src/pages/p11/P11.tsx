/**
 * P11 价格健康页（overbooking-parity-guard 数据投影）
 *  - 倒挂熔断（R17）/ 超售·同步失败防护（R18）/ 修复留痕（检出→处置→结果三段式）
 *  - 连续调价事件流（R1 白班 / R7 夜班微调，含 before/after/依据）
 *  - 数据源：twin.priceHealth（五元事件库 price.publish / inventory.sync / channel.parity.fixed / price.adjust）
 * 轮询：15s（D6 其余口径）
 */
import { useEffect, useMemo, useState } from "react";
import { ensureDemoLogin, trpc } from "../../lib/trpc";
import { Bridge } from "../../shell/Bridge";
import { EmptyState, SkeletonBlock, SystemDivider } from "../../components/hud";
import { PageNav } from "../../components/PageNav";

interface Ev {
  event_id: string;
  context: { time: string; channel?: string; night_shift?: boolean };
  object: { type: string; id?: string; label?: string };
  decision: {
    action: string;
    before?: { price?: number };
    after?: { price?: number; blocked?: boolean; gap_pct?: number; auto_offshelf?: boolean; restored_price?: number; onshelf?: boolean; reason?: string };
    params?: { channel_price?: number; other_channel_min?: number; available?: number; sync_failed?: boolean };
    basis?: string[];
  };
  rule_impact: Array<{ rule_id: string; result: string }>;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
const ruleOf = (ev: Ev) => ev.rule_impact?.[0]?.rule_id ?? "";

export default function P11() {
  const [ready, setReady] = useState(false);
  const [blocks, setBlocks] = useState<Ev[]>([]);
  const [fixes, setFixes] = useState<Ev[]>([]);
  const [adjusts, setAdjusts] = useState<Ev[]>([]);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      await ensureDemoLogin();
      const r = (await trpc.twin.priceHealth.query()) as unknown as { blocks: Ev[]; fixes: Ev[]; adjusts: Ev[] };
      if (stop) return;
      setBlocks(r.blocks); setFixes(r.fixes); setAdjusts(r.adjusts);
      setReady(true);
    };
    void load();
    const t = setInterval(() => void load(), 15_000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  const parityBlocks = useMemo(() => blocks.filter((b) => ruleOf(b) === "R17"), [blocks]);
  const syncBlocks = useMemo(() => blocks.filter((b) => ruleOf(b) === "R18"), [blocks]);

  const right = (
    <>
      <div className="mb-2 px-1 text-[11px] tracking-[.2em] text-ink3">30 天防护 · GUARD</div>
      {[
        { label: "倒挂熔断（R17）", n: parityBlocks.length, cls: "text-warn" },
        { label: "超售/同步防护（R18）", n: syncBlocks.length, cls: "text-warn" },
        { label: "自动修复回架", n: fixes.length, cls: "text-go" },
        { label: "连续调价动作", n: adjusts.length, cls: "text-holo" },
      ].map((s) => (
        <div key={s.label} className="mb-2 flex items-center justify-between rounded-lg border border-line bg-card px-3 py-2.5 text-xs">
          <span className="text-ink2">{s.label}</span>
          <b className={`font-mono ${s.cls}`}>{s.n}</b>
        </div>
      ))}
      <div className="mt-3 rounded-lg border border-gline bg-card p-3 text-xs leading-relaxed text-ink3">
        倒挂发布物理熔断；库存同步失败自动下架保护（防超售/漏售），人工核验后回架。检出→处置→结果三段留痕，全链可溯。
      </div>
    </>
  );

  return (
    <Bridge left={<PageNav current="P11" />} right={right}>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-h1 font-black tracking-wider">价格健康</h2>
        <span className="text-[11px] tracking-[.2em] text-ink3">P11 · PRICE HEALTH</span>
      </div>

      {!ready ? (
        <><SkeletonBlock lines={2} h={44} /><SkeletonBlock lines={4} /></>
      ) : blocks.length === 0 && adjusts.length === 0 ? (
        <EmptyState icon="🛡️" title="全渠道健康" hint="倒挂/超售零告警。看门狗每 15 分钟巡检中。" />
      ) : (
        <div className="space-y-3">
          <SystemDivider time="防护留痕" summary="倒挂熔断 / 超售防护 / 修复回架（检出→处置→结果）" />
          {[...blocks, ...fixes]
            .sort((a, b) => +new Date(b.context.time) - +new Date(a.context.time))
            .map((ev) => {
              const rule = ruleOf(ev);
              const a = ev.decision.after ?? {};
              const p = ev.decision.params ?? {};
              const isFix = ev.decision.action.includes("fixed") || ev.decision.action.includes("restore");
              return (
                <div key={ev.event_id} className="rounded-lg border border-line bg-card p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-ink3">{fmtTime(ev.context.time)}</span>
                    <span className={`rounded border px-1.5 py-0.5 font-mono text-[11px] ${isFix ? "border-go/40 text-go" : "border-warn/40 text-warn"}`}>
                      {isFix ? "已修复" : rule || "巡检"}
                    </span>
                    <span className="text-body font-semibold text-ink2">
                      {ev.context.channel ?? ev.object.id ?? "渠道"}
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs leading-relaxed text-ink3">
                    {ev.decision.action === "price.publish" && (
                      <>发布价 <b className="text-warn">¥{p.channel_price}</b> &lt; 他渠道最低 ¥{p.other_channel_min}×90% → 倒挂熔断{a.gap_pct ? `（${a.gap_pct}%）` : ""}</>
                    )}
                    {ev.decision.action === "inventory.sync" && (
                      <>同步失败/可售异常 → <b className="text-warn">自动下架保护</b>{a.reason ? `（${a.reason}）` : ""}</>
                    )}
                    {ev.decision.action === "channel.parity.fixed" && (
                      <>一致性定价恢复 <b className="text-go">¥{a.restored_price}</b>（{(a as { approved_by?: string }).approved_by ?? "人工"} 审批）</>
                    )}
                    {ev.decision.action === "inventory.sync.restore" && <>直连恢复，人工核验后<b className="text-go">重新上架</b></>}
                    {ev.decision.basis?.[0] ? <div className="mt-1 text-[11px]">{ev.decision.basis[0]}</div> : null}
                  </div>
                </div>
              );
            })}
          <SystemDivider time="连续调价流" summary="价格 = 围栏内的连续函数（R1 白班 ≤8% auto / R7 夜班 ≤3% auto）" />
          {adjusts.slice(0, 10).map((ev) => {
            const b = ev.decision.before?.price;
            const a = ev.decision.after?.price;
            const pct = b && a ? (((a - b) / b) * 100).toFixed(1) : null;
            return (
              <div key={ev.event_id} className="flex items-center gap-3 rounded-lg border border-line bg-card px-3 py-2.5">
                <span className="font-mono text-[11px] text-ink3">{fmtTime(ev.context.time)}</span>
                <span className="text-xs text-ink2">{ev.object.label ?? ev.object.id}</span>
                <span className="font-mono text-xs text-ink3">¥{b} → <b className="text-gold">¥{a}</b></span>
                {pct ? <span className="text-[11px] text-go">+{pct}%</span> : null}
                <span className="flex-1" />
                <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink3">
                  {ruleOf(ev)}{ev.context.night_shift ? " · 夜班" : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Bridge>
  );
}
