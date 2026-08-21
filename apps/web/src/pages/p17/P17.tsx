/**
 * P17 前厅与客房（E1–E6：入退看板 / 智能排房 / 派单质检 / 布草四态与损耗）
 * 数据源：twin.events（pms.checkin / pms.checkout / task.complete / inventory.loss）+ twin.archive（linen/operations）
 */
import { useEffect, useMemo, useState } from "react";
import { ensureDemoLogin, trpc } from "../../lib/trpc";
import { Bridge } from "../../shell/Bridge";
import { EmptyState, SkeletonBlock, SystemDivider } from "../../components/hud";
import { PageNav } from "../../components/PageNav";
import { Ev, fmtTime, HBar, Note, PageHead, Row, Stat, Tag } from "../../components/Twin";

interface Linen {
  initial_sets?: Record<string, number>;
  laundry_vendor?: string;
  baseline_loss_rate?: number;
  delivery_tolerance?: number;
}

export default function P17() {
  const [ready, setReady] = useState(false);
  const [evs, setEvs] = useState<Ev[]>([]);
  const [linen, setLinen] = useState<Linen | null>(null);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      await ensureDemoLogin();
      const [r, arch] = await Promise.all([
        trpc.twin.events.query({ actions: ["pms.checkin", "pms.checkout", "task.complete", "inventory.loss"], limit: 100 }) as unknown as Promise<Ev[]>,
        trpc.twin.archive.query() as unknown as Promise<{ archive: { linen?: Linen } } | null>,
      ]);
      if (stop) return;
      setEvs(r); setLinen(arch?.archive?.linen ?? null); setReady(true);
    };
    void load();
    const t = setInterval(() => void load(), 15_000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  const ins = useMemo(() => evs.filter((e) => e.decision.action === "pms.checkin"), [evs]);
  const outs = useMemo(() => evs.filter((e) => e.decision.action === "pms.checkout"), [evs]);
  const tasks = useMemo(() => evs.filter((e) => e.decision.action === "task.complete"), [evs]);
  const losses = useMemo(() => evs.filter((e) => e.decision.action === "inventory.loss"), [evs]);

  return (
    <Bridge left={<PageNav current="P17" />}>
      <PageHead title="前厅与客房" tag="P17 · FRONT & HOUSEKEEPING" />
      {!ready ? (<><SkeletonBlock lines={2} h={44} /><SkeletonBlock lines={4} /></>) : (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <Stat label="入住（窗口）" value={ins.length} hint="智能排房 · ≤5 分钟" />
            <Stat label="退房结算" value={outs.length} tone="text-go" hint="押金 <5 分钟退还" />
            <Stat label="客房工单达标" value={tasks.length} tone="text-go" hint="清单+拍照 AI 初检" />
            <Stat label="损耗告警（R20）" value={losses.length} tone="text-warn" hint="超基线 1.5× 必审" />
          </div>

          <SystemDivider time="入退与排房" summary="画像 × 房况避坑排房（历史/会员/特殊需求 × 楼层/朝向/噪音/相邻房）" />
          {[...ins.slice(0, 6), ...outs.slice(0, 4)].sort((a, b) => +new Date(b.context.time) - +new Date(a.context.time)).map((ev) => (
            <Row key={ev.event_id} time={fmtTime(ev.context.time)} right={<Tag tone={ev.decision.action === "pms.checkin" ? "holo" : "go"}>{ev.decision.action === "pms.checkin" ? "入住" : "退房"}</Tag>}>
              <b className="text-ink2">{ev.object.id}</b>
              <span className="text-ink3"> · {String(ev.decision.basis?.[0] ?? "")}</span>
            </Row>
          ))}

          <SystemDivider time="客房派单（按预抵紧急度排序）" summary="清单化清洁 · 拍照 AI 初检全量（非抽查）· 异常自动返工闭环" />
          {tasks.slice(0, 10).map((ev) => (
            <Row key={ev.event_id} time={fmtTime(ev.context.time)} right={<Tag tone={ev.decision.after?.photo_check === "pass" ? "go" : "warn"}>{ev.decision.after?.photo_check === "pass" ? "AI 初检 pass" : "返工"}</Tag>}>
              <b className="text-ink2">{String(ev.decision.after?.room ?? ev.object.id)}</b>
              <span className="text-ink3"> · 工单 {ev.object.id} · 用时 {String(ev.decision.after?.minutes ?? "—")} 分钟</span>
            </Row>
          ))}
          {tasks.length === 0 ? <EmptyState icon="🧹" title="暂无工单" hint="清洁任务将按预抵紧急度自动派单。" /> : null}

          <SystemDivider time="布草四态与损耗" summary={`洗涤商 ${linen?.laundry_vendor ?? "—"} · 损耗基线 ${((linen?.baseline_loss_rate ?? 0.03) * 100).toFixed(0)}% · 交付容差 ${((linen?.delivery_tolerance ?? 0.02) * 100).toFixed(0)}%`} />
          {Object.entries(linen?.initial_sets ?? {}).map(([k, v]) => (
            <HBar key={k} label={k} pct={Math.min(100, Math.round((v / 360) * 100))} value={`${v} 件`} />
          ))}
          {losses.map((ev) => (
            <Row key={ev.event_id} time={fmtTime(ev.context.time)} right={<Tag tone="warn">R20 必审</Tag>}>
              <b className="text-ink2">{String(ev.decision.params?.item ?? "布草")}</b>
              <span className="text-ink3"> · 损耗率 {(Number(ev.decision.params?.loss_rate ?? 0) * 100).toFixed(1)}%（基线 {(Number(ev.decision.params?.baseline_loss_rate ?? 0) * 100).toFixed(0)}%）· {String(ev.decision.after?.heatmap ?? "")}</span>
            </Row>
          ))}
          <Note>库存是事件流的衍生品：盘点从「计数」退化为「校验」。损耗热力图定位到楼层房型，区分正常磨损与异常流失。</Note>
        </div>
      )}
    </Bridge>
  );
}
