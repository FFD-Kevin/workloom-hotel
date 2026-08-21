/**
 * P16 AI 语音前台（D4：24h 接听 / 意图六分类 / FAQ 知识库自生长 / 三级转人工）
 * 数据源：twin.events（call.summary / faq.mine）+ twin.archive（faq_kb 字段组）
 */
import { useEffect, useMemo, useState } from "react";
import { ensureDemoLogin, trpc } from "../../lib/trpc";
import { Bridge } from "../../shell/Bridge";
import { EmptyState, SkeletonBlock, SystemDivider } from "../../components/hud";
import { PageNav } from "../../components/PageNav";
import { Ev, fmtTime, HBar, Note, PageHead, Row, Stat, Tag } from "../../components/Twin";

interface FaqKb {
  top_questions?: Array<{ q: string; a: string; confirmed: boolean }>;
  pending_candidates?: Array<{ q: string; weekly_hits?: number; confirmed: boolean }>;
  last_mined_at?: string | null;
}

export default function P16() {
  const [ready, setReady] = useState(false);
  const [calls, setCalls] = useState<Ev[]>([]);
  const [mines, setMines] = useState<Ev[]>([]);
  const [kb, setKb] = useState<FaqKb | null>(null);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let stop = false;
    const load = async () => {
      await ensureDemoLogin();
      const [evs, arch] = await Promise.all([
        trpc.twin.events.query({ actions: ["call.summary", "faq.mine"], limit: 100 }) as unknown as Promise<Ev[]>,
        trpc.twin.archive.query() as unknown as Promise<{ archive: { faq_kb?: FaqKb } } | null>,
      ]);
      if (stop) return;
      setCalls(evs.filter((e) => e.decision.action === "call.summary"));
      setMines(evs.filter((e) => e.decision.action === "faq.mine"));
      setKb(arch?.archive?.faq_kb ?? null);
      setReady(true);
    };
    void load();
    const t = setInterval(() => void load(), 15_000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  const hits = useMemo(() => calls.filter((c) => c.decision.params?.faq_hit === true).length, [calls]);
  const hitRate = calls.length ? Math.round((hits / calls.length) * 100) : 0;

  return (
    <Bridge left={<PageNav current="P16" />}>
      <PageHead title="AI 语音前台" tag="P16 · PHONE CONCIERGE" extra={<Tag tone="go">24h 在线</Tag>} />
      {!ready ? (<><SkeletonBlock lines={2} h={44} /><SkeletonBlock lines={4} /></>) : (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <Stat label="呼入（窗口）" value={calls.length} />
            <Stat label="AI 独立应答" value={`${hitRate}%`} tone="text-go" hint="知识库命中即答" />
            <Stat label="转人工" value={calls.length - hits} tone="text-holo" hint="附对话上下文" />
            <Stat label="夜间打扰业主" value="0 次" tone="text-go" hint="转值班手机，不叫醒" />
          </div>
          <HBar label="FAQ 命中率" pct={hitRate} tone="bg-go" />

          <SystemDivider time="通话摘要（五元留痕）" summary="意图识别 → 命中即答 / 三级转人工（投诉预生成安抚话术 · 疑似欺诈挂断+告警）" />
          {calls.slice(0, 15).map((ev) => {
            const hit = ev.decision.params?.faq_hit === true;
            return (
              <Row key={ev.event_id} time={fmtTime(ev.context.time)} right={<Tag tone={hit ? "go" : "holo"}>{hit ? "命中即答" : "转人工"}</Tag>}>
                <b className="text-ink2">「{String(ev.decision.params?.topic ?? "咨询")}」</b>
                <span className="text-ink3"> · {String(ev.decision.basis?.[0] ?? "")} · {String(ev.decision.params?.duration_sec ?? "—")}s</span>
              </Row>
            );
          })}
          {calls.length === 0 ? <EmptyState icon="📞" title="暂无通话" hint="电话呼入后实时生成摘要。" /> : null}

          <SystemDivider time="FAQ 知识库自生长" summary="未命中问题周问 ≥3 次自动成候选 · 店长确认入库 · 三通道（IM/微信/电话）口径一致" />
          {(kb?.top_questions ?? []).map((f) => (
            <Row key={f.q} right={<Tag tone="go">已入库 · 首响 ≤3s</Tag>}>
              <b className="text-ink2">「{f.q}」</b><span className="text-ink3"> → {f.a}</span>
            </Row>
          ))}
          {(kb?.pending_candidates ?? []).map((f) => (
            <Row key={f.q} right={
              confirmed.has(f.q)
                ? <Tag tone="go">已入库 ✓</Tag>
                : <button type="button" onClick={() => setConfirmed((s) => new Set(s).add(f.q))} className="rounded border border-gline px-2 py-0.5 font-mono text-[10.5px] text-gold">确认入库</button>
            }>
              <b className="text-warn">「{f.q}」</b>
              <span className="text-ink3"> · 周问 {f.weekly_hits ?? "≥3"} 次 · 来源通话可归因</span>
            </Row>
          ))}
          {mines.slice(0, 4).map((ev) => (
            <Row key={ev.event_id} time={fmtTime(ev.context.time)} right={<Tag tone="gold">萃取记录</Tag>}>
              <span className="text-ink3">{String(ev.decision.basis?.[0] ?? "FAQ 萃取")}</span>
            </Row>
          ))}
          <Note>知识库不是人工录入的静态 FAQ——它每周自动变聪明。民宿叙事：「把夜晚还给业主」，晚上可以关机。</Note>
        </div>
      )}
    </Bridge>
  );
}
