/**
 * 舰桥框架（F1：壳 + 顶栏，视觉事实源=原型 V4.0 .frame/.abar/.night-pill/.brk，D5）
 *  - 星野背景（设计公理 Ⅰ/§7 drift 90s：星云渐变层 + 星点层，禁死黑满铺；reduced-motion 降级静态）
 *  - HUD 四角金色刻度（原型 .frame::before/::after/.bc：18px·2px·贴边·随 20px 圆角）
 *  - 顶栏：logo / 工作区 / 夜班状态胶囊（P1E5，含 paused 变体）/ 紧急制动杆（P1E6，.brk 描边款）
 *  - IM 三栏：236px 左会话列表｜弹性中央｜264px 右上下文（§4.1）
 * 内部数据为占位；逐页接线真实 API 在 F3–F11。
 */
import type { ReactNode } from "react";

/** 星野背景（氛围层；永不遮挡信息、不影响 G10 首屏口径——§7 动效纪律） */
function StarField() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {/* 星云晕染层（星云紫仅出现在背景晕染——§2.2） */}
      <div
        className="absolute inset-0 animate-drift"
        style={{
          background:
            "radial-gradient(60% 45% at 18% 8%, rgb(36 27 77 / .55), transparent 70%)," +
            "radial-gradient(50% 40% at 85% 20%, rgb(58 42 110 / .38), transparent 70%)," +
            "radial-gradient(70% 50% at 50% 110%, rgb(36 27 77 / .45), transparent 70%)",
        }}
      />
      {/* 星点层（确定性伪随机分布；随 drift 同层缓漂） */}
      <div
        className="absolute inset-0 animate-drift"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 12% 22%, rgb(234 241 255 / .8) 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 34% 68%, rgb(234 241 255 / .5) 50%, transparent 51%)," +
            "radial-gradient(1.5px 1.5px at 57% 15%, rgb(69 224 255 / .6) 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 72% 47%, rgb(234 241 255 / .7) 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 88% 78%, rgb(234 241 255 / .45) 50%, transparent 51%)," +
            "radial-gradient(1.5px 1.5px at 25% 88%, rgb(255 181 69 / .5) 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 45% 40%, rgb(234 241 255 / .55) 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 66% 90%, rgb(234 241 255 / .6) 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 94% 10%, rgb(234 241 255 / .5) 50%, transparent 51%)," +
            "radial-gradient(1.5px 1.5px at 8% 55%, rgb(69 224 255 / .4) 50%, transparent 51%)",
        }}
      />
    </div>
  );
}

/** HUD 四角金色刻度（原型 .frame::before/::after/.bc：18px·2px·贴边·随舰桥圆角） */
function CornerTicks() {
  const base = "pointer-events-none absolute h-[18px] w-[18px] border-2 border-gold z-10";
  return (
    <>
      <span className={`${base} -top-px -left-px rounded-tl-bridge border-r-0 border-b-0`} />
      <span className={`${base} -top-px -right-px rounded-tr-bridge border-l-0 border-b-0`} />
      <span className={`${base} -bottom-px -left-px rounded-bl-bridge border-r-0 border-t-0`} />
      <span className={`${base} -bottom-px -right-px rounded-br-bridge border-l-0 border-t-0`} />
    </>
  );
}

/**
 * P1E5 顶栏夜班状态胶囊（原型 .night-pill：999px 圆角 + 呼吸灯）
 * 变体：巡航（全息青 · pulse 1.6s）/ 已暂停（待定琥珀 · pulse 2s）——状态机投影位（F4.8）
 * 壳阶段静态占位「已就绪」；接线夜班 run 状态在 F11/P9 落地。
 */
function NightStatusPill({ paused = false }: { paused?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11.5px] ${
        paused ? "border-warn/45 bg-warn/7" : "border-holo/40 bg-holo/7"
      }`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          paused
            ? "bg-warn shadow-[0_0_10px_var(--color-warn)] animate-pulse-warn"
            : "bg-holo shadow-[0_0_10px_var(--color-holo)] animate-pulse-hud"
        }`}
      />
      {paused ? (
        <b className="font-semibold text-warn">夜班 · 已暂停（制动生效）</b>
      ) : (
        <b className="font-semibold text-holo">夜班 · 已就绪 22:00 出征</b>
      )}
    </span>
  );
}

/**
 * P1E6 紧急制动杆（原型 .brk 描边款：警报红描边/文字/7% 底）
 * 制动/驳回永远严肃可用（§9.3）；G5 一键暂停 ≤60s 的点击逻辑在 F3/P9 落地。
 */
function EmergencyBrake() {
  return (
    <button
      type="button"
      className="cursor-pointer rounded-lg border border-alert/55 bg-alert/7 px-3.5 py-1.5 text-xs font-extrabold tracking-wider text-alert transition-colors hover:bg-alert/15"
      title="紧急制动：一键暂停全部夜间 Agent（G5 · ≤60s）"
    >
      🛑 紧急制动
    </button>
  );
}

export function Bridge({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg950">
      <StarField />
      <div className="relative flex min-h-screen items-start justify-center py-8">
        <div className="relative w-bridge overflow-hidden rounded-bridge border border-line bg-gradient-to-b from-[#0a1230eb] to-[#050a1af5] shadow-[0_30px_80px_rgba(0,0,0,.55)]">
          <CornerTicks />

          {/* 顶栏（原型 V4.0 .abar chrome 条） */}
          <header className="flex items-center gap-3.5 border-b border-line bg-bg950/90 px-4.5 py-2.5 backdrop-blur-md">
            <div className="flex items-center gap-2.5 text-[15px] font-black tracking-wider">
              <span className="inline-block h-4 w-4 rotate-45 rounded gold-grad shadow-[0_0_14px_rgba(255,160,60,.6)]" />
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

          {/* IM 三栏（§4.1：236px 左｜弹性中｜264px 右；栏间 1px 全息青细线=border-line） */}
          <div className="flex min-h-[640px]">
            {/* 左侧会话列表（占位：演示线程 T-101/102/103，种子数据口径） */}
            <aside className="w-col-left border-r border-line p-3">
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
                  <div className="mt-1 text-body text-ink2">{t.title}</div>
                </div>
              ))}
            </aside>

            {/* 主区 */}
            <main className="flex-1 p-5">{children}</main>

            {/* 右上下文面板（占位） */}
            <aside className="w-col-right border-l border-line p-3">
              <div className="mb-2 px-1 text-[11px] tracking-[.2em] text-ink3">上下文 · CONTEXT</div>
              <div className="rounded-lg border border-line bg-card p-3 text-xs leading-relaxed text-ink3">
                档案 / 阶段 / 目标三要素投影位（L3.7）。阶段三接线。
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
