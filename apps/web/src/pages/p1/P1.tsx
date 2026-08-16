/**
 * P1 主甲板·舰桥（A6：空 P1 壳 + tRPC 握手实测）
 * 状态变体（阶段三 F3 落地）：p1 / p1_loading / p1_empty / p1_community
 * 本卡验收：浏览器打开可见星盟战舰基底，tRPC 握手 200（连接状态卡实时显示）
 */
import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";

type Health = {
  ok: boolean;
  service: string;
  phase: string;
  db: "up" | "down";
  time: string;
};

export default function P1() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trpc.system.health
      .query()
      .then((h) => setHealth(h))
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-black tracking-wider">主甲板 · 舰桥</h2>
        <span className="text-[11px] tracking-[.2em] text-ink3">P1 · MAIN DECK</span>
      </div>

      {/* 连接状态卡（A6 验收证据：握手 200 即 ok=true） */}
      <div className="rounded-xl border border-line bg-card p-4">
        <div className="mb-2 text-[11px] tracking-[.2em] text-ink3">链路自检 · tRPC</div>
        {error && (
          <div className="text-sm text-alert">连接中断 · 重连中（{error}）</div>
        )}
        {!error && !health && <div className="text-sm text-ink3">识别中…</div>}
        {health && (
          <div className="grid grid-cols-2 gap-2 font-mono text-[12.5px]">
            <div>
              tRPC 握手：<span className={health.ok ? "text-go" : "text-alert"}>{health.ok ? "200 OK" : "FAIL"}</span>
            </div>
            <div>
              数据库：<span className={health.db === "up" ? "text-go" : "text-alert"}>{health.db}</span>
            </div>
            <div className="col-span-2 text-ink3">{health.service} · {health.phase}</div>
          </div>
        )}
      </div>

      {/* 空态占位（p1_empty 变体的壳） */}
      <div className="rounded-xl border border-dashed border-line p-10 text-center">
        <div className="mb-2 text-3xl">✨</div>
        <div className="text-sm text-ink2">今夜风平浪静 · 交接班卡 / KPI / 需要关注区（阶段三 F3 接线）</div>
        <div className="mt-1 text-xs text-ink3">三投影数据源已就位：种子事件 100 条 · 审批队列 · 夜班决策包</div>
      </div>
    </div>
  );
}
