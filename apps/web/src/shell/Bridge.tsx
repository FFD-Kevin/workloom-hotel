/**
 * 舰桥框架（A6 壳；视觉事实源=原型 V4.0 .frame/.topbar，D5）
 * 1180px 居中舰桥 + HUD 四角刻度 + 顶栏（logo / 夜班状态胶囊 / 紧急制动杆）+
 * 左侧会话列表 + 右上下文面板。本卡为壳：内部数据为占位，阶段三 F1/F3 接线真实 API。
 */
import type { ReactNode } from "react";

/** HUD 四角刻度（舰桥装饰，纯视觉） */
function CornerTicks() {
  const base = "pointer-events-none absolute h-3 w-3 border-gold/60";
  return (
    <>
      <span className={`${base} left-2 top-2 border-l-2 border-t-2`} />
      <span className={`${base} right-2 top-2 border-r-2 border-t-2`} />
      <span className={`${base} bottom-2 left-2 border-b-2 border-l-2`} />
      <span className={`${base} bottom-2 right-2 border-b-2 border-r-2`} />
    </>
  );
}

/** 夜班状态胶囊（F4.8 状态机投影位；壳阶段静态占位「已就绪」） */
function NightStatusPill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-holo/40 bg-holo/5 px-2.5 py-1 text-[11px] tracking-widest text-holo">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-go" />
      夜班 · 已就绪 22:00 出征
    </span>
  );
}

/** 紧急制动杆（G5：一键暂停 ≤60s；壳阶段仅视觉，点击逻辑在 F3/P9 落地） */
function EmergencyBrake() {
  return (
    <button
      type="button"
      className="rounded-lg bg-gradient-to-br from-alert to-[#e83a5c] px-3.5 py-1.5 text-xs font-extrabold tracking-wider text-white"
      title="紧急制动：一键暂停全部夜间 Agent（G5 · ≤60s）"
    >
      🛑 紧急制动
    </button>
  );
}

export function Bridge({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-start justify-center py-8">
      <div className="relative w-[1180px] overflow-hidden rounded-[20px] border border-line bg-gradient-to-b from-[#0a1230eb] to-[#050a1af5] shadow-[0_30px_80px_rgba(0,0,0,.55)]">
        <CornerTicks />

        {/* 顶栏（原型 V4.0 chrome 条） */}
        <header className="flex items-center gap-3.5 border-b border-line bg-bg950/90 px-4.5 py-2.5 backdrop-blur-md">
          <div className="flex items-center gap-2.5 text-[15px] font-black tracking-wider">
            <span className="inline-block h-4 w-4 rotate-45 rounded bg-gradient-to-br from-gold to-gold2 shadow-[0_0_14px_rgba(255,160,60,.6)]" />
            <span className="bg-gradient-to-r from-[#fff6e3] to-gold bg-clip-text text-transparent">
              WorkLoom
            </span>
          </div>
          <span className="text-xs text-ink3">
            企业 Agent IM · <b className="font-semibold text-ink2">云栖酒店</b>
          </span>
          <span className="flex-1" />
          <NightStatusPill />
          <EmergencyBrake />
        </header>

        <div className="flex min-h-[640px]">
          {/* 左侧会话列表（占位：演示线程 T-101/102/103，种子数据口径） */}
          <aside className="w-[240px] border-r border-line p-3">
            <div className="mb-2 px-1 text-[11px] tracking-[.2em] text-ink3">会话 · THREADS</div>
            {[
              { id: "T-101", title: "周五旺季调价", status: "completed", cls: "text-go" },
              { id: "T-102", title: "差评应急回复", status: "pending_review", cls: "text-warn" },
              { id: "T-103", title: "飞猪首图发布", status: "running", cls: "text-holo" },
            ].map((t) => (
              <div
                key={t.id}
                className="mb-1.5 cursor-pointer rounded-lg border border-line bg-card px-3 py-2.5 hover:border-gline"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-ink3">{t.id}</span>
                  <span className={`text-[11px] ${t.cls}`}>{t.status}</span>
                </div>
                <div className="mt-1 text-[12.5px] text-ink2">{t.title}</div>
              </div>
            ))}
          </aside>

          {/* 主区 */}
          <main className="flex-1 p-5">{children}</main>

          {/* 右上下文面板（占位） */}
          <aside className="w-[260px] border-l border-line p-3">
            <div className="mb-2 px-1 text-[11px] tracking-[.2em] text-ink3">上下文 · CONTEXT</div>
            <div className="rounded-lg border border-line bg-card p-3 text-xs leading-relaxed text-ink3">
              档案 / 阶段 / 目标三要素投影位（L3.7）。阶段三接线。
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
