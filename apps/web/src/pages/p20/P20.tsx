/**
 * P20 门店档案全景（槽①：五类 21 字段组——Agent 生成内容前必读三要素之一 L3.7）
 * 数据源：twin.archive（profiles.archive 全量 + forbidden 硬约束独立列）
 */
import { useEffect, useState } from "react";
import { ensureDemoLogin, trpc } from "../../lib/trpc";
import { Bridge } from "../../shell/Bridge";
import { EmptyState, SkeletonBlock } from "../../components/hud";
import { PageNav } from "../../components/PageNav";
import { Note, PageHead, Tag } from "../../components/Twin";

type Archive = Record<string, unknown>;

/** 字段组展示分节（五类口径与 schemas/archive.schema.json 对齐） */
const SECTIONS: Array<{ title: string; keys: string[] }> = [
  { title: "基础类", keys: ["property", "brand_guideline"] },
  { title: "业务类", keys: ["business", "competitors", "channels", "price_calendar", "goals", "audience", "history_curve"] },
  { title: "运营类", keys: ["operations", "staffing", "suppliers", "linen", "incident_profile", "faq_kb", "inspection"] },
  { title: "治理类", keys: ["sop", "forbidden", "approval_matrix", "compensation_policy"] },
  { title: "记忆类", keys: ["memory"] },
];

function renderValue(v: unknown, depth = 0): React.ReactNode {
  if (v === null || v === undefined) return <span className="text-ink3">—</span>;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return <span className="text-ink2">{String(v)}</span>;
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x !== "object")) return <span className="text-ink2">{v.join("、")}</span>;
    return (
      <div className="mt-1 space-y-1">
        {v.slice(0, 6).map((x, i) => (
          <div key={i} className="rounded border border-line bg-bg950 px-2 py-1">{renderValue(x, depth + 1)}</div>
        ))}
        {v.length > 6 ? <div className="text-[10px] text-ink3">…共 {v.length} 项</div> : null}
      </div>
    );
  }
  const entries = Object.entries(v as Record<string, unknown>);
  return (
    <div className={`grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 ${depth > 0 ? "text-[11px]" : "text-xs"}`}>
      {entries.slice(0, 12).map(([k, val]) => (
        <div key={k} className="contents">
          <span className="text-ink3">{k}</span>
          <span>{renderValue(val, depth + 1)}</span>
        </div>
      ))}
      {entries.length > 12 ? <div className="col-span-2 text-[10px] text-ink3">…共 {entries.length} 字段</div> : null}
    </div>
  );
}

const rightPanel = (
  <>
    <div className="mb-2 px-1 text-[11px] tracking-[.2em] text-ink3">档案即配置 · ARCHIVE</div>
    <div className="rounded-lg border border-gline bg-card p-3 text-xs leading-relaxed text-ink3">改档案即改系统行为边界：保底价与 R2 同源、审批矩阵与 R4/R11 同源、损耗基线与 R20 同源。</div>
  </>
);

export default function P20() {
  const [ready, setReady] = useState(false);
  const [archive, setArchive] = useState<Archive | null>(null);

  useEffect(() => {
    void (async () => {
      await ensureDemoLogin();
      const r = (await trpc.twin.archive.query()) as unknown as { archive: Archive } | null;
      setArchive(r?.archive ?? null);
      setReady(true);
    })();
  }, []);

  return (
    <Bridge right={rightPanel} left={<PageNav current="P20" />}>
      <PageHead title="门店档案" tag="P20 · ARCHIVE" extra={<Tag tone="gold">全景档案</Tag>} />
      {!ready ? (<><SkeletonBlock lines={2} h={44} /><SkeletonBlock lines={4} /></>) : !archive ? (
        <EmptyState icon="🗂️" title="档案未建立" hint="门店档案是 Agent 生成内容前的必读三要素之一（L3.7）。" />
      ) : (
        <div className="space-y-3">
          {SECTIONS.map((sec) => {
            const present = sec.keys.filter((k) => archive[k] !== undefined);
            if (present.length === 0) return null;
            return (
              <div key={sec.title} className="rounded-lg border border-line bg-card p-3">
                <div className="mb-2 text-[11px] tracking-[.15em] text-gold">{sec.title}</div>
                <div className="space-y-2.5">
                  {present.map((k) => (
                    <div key={k}>
                      <div className="mb-0.5 flex items-center gap-2">
                        <span className="font-mono text-[11px] text-holo">{k}</span>
                        {k === "forbidden" ? <Tag tone="warn">硬约束 · L1.6 双写</Tag> : null}
                        {k === "goals" ? <Tag tone="gold">P12 数据源</Tag> : null}
                        {k === "faq_kb" ? <Tag tone="go">P16 数据源</Tag> : null}
                      </div>
                      {renderValue(archive[k])}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <Note>档案即配置：保底价与 R2 同源、审批矩阵与 R4/R11 同源、损耗基线与 R20 同源——改档案即改系统行为边界，一切 Agent 读同一事实源。</Note>
        </div>
      )}
    </Bridge>
  );
}
