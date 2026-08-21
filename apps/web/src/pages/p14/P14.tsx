/**
 * P14 渠道运营（B2：6–8 渠道价格/库存/活动/图评一屏巡检 + 内容营销）
 * 数据源：twin.archive（inspection 巡检快照/channels）+ twin.events（content.publish/competitor.fetch/price.publish）
 */
import { useEffect, useState } from "react";
import { ensureDemoLogin, trpc } from "../../lib/trpc";
import { Bridge } from "../../shell/Bridge";
import { SkeletonBlock, SystemDivider } from "../../components/hud";
import { PageNav } from "../../components/PageNav";
import { Ev, fmtTime, HBar, Note, PageHead, Row, Tag } from "../../components/Twin";

interface ArchiveShape {
  channels?: Array<{ name: string; kind: string; channel_new?: boolean }>;
  inspection?: { channels?: Array<{ channel: string; price: number; parity: boolean; status: string }> };
}

export default function P14() {
  const [ready, setReady] = useState(false);
  const [archive, setArchive] = useState<ArchiveShape | null>(null);
  const [contents, setContents] = useState<Ev[]>([]);
  const [competitor, setCompetitor] = useState<Ev[]>([]);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      await ensureDemoLogin();
      const [a, evs] = await Promise.all([
        trpc.twin.archive.query() as unknown as Promise<{ archive: ArchiveShape } | null>,
        trpc.twin.events.query({ actions: ["content.publish", "competitor.fetch"], limit: 40 }) as unknown as Promise<Ev[]>,
      ]);
      if (stop) return;
      setArchive(a?.archive ?? null);
      setContents(evs.filter((e) => e.decision.action === "content.publish"));
      setCompetitor(evs.filter((e) => e.decision.action === "competitor.fetch"));
      setReady(true);
    };
    void load();
    const t = setInterval(() => void load(), 15_000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  const snap = archive?.inspection?.channels ?? [];
  const chanDefs = archive?.channels ?? [];

  return (
    <Bridge left={<PageNav current="P14" />}>
      <PageHead title="渠道运营" tag="P14 · CHANNELS" extra={<Tag tone="holo">每 30 分钟自动巡检</Tag>} />
      {!ready ? (<><SkeletonBlock lines={2} h={44} /><SkeletonBlock lines={4} /></>) : (
        <div className="space-y-3">
          <SystemDivider time="渠道巡检快照" summary="价格一致性 / 库存同步 / 在线状态（一店档 inspection 探针输入）" />
          {snap.length === 0 ? (
            <div className="rounded-lg border border-line bg-card p-3 text-xs text-ink3">暂无巡检快照（档案 inspection 字段组未配置）。</div>
          ) : snap.map((c) => (
            <Row key={c.channel} right={<>
              <Tag tone={c.parity ? "go" : "warn"}>{c.parity ? "价格一致" : "价差异常"}</Tag>
              <Tag tone={c.status === "online" ? "holo" : "warn"}>{c.status}</Tag>
            </>}>
              <b className="text-ink2">{c.channel}</b>
              <span className="ml-2 font-mono text-gold">¥{c.price}</span>
              {!c.parity ? <span className="ml-2 text-warn">· 低于他渠道，R17 联动熔断复核中</span> : null}
            </Row>
          ))}

          <SystemDivider time="渠道清单" summary={`${chanDefs.length} 个已接入渠道（OTA/直播/内容）`} />
          <div className="grid grid-cols-2 gap-2.5">
            {chanDefs.map((c) => (
              <div key={c.name} className="flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2.5 text-xs">
                <b className="text-ink2">{c.name}</b>
                <span className="text-ink3">{c.kind}</span>
                <span className="flex-1" />
                {c.channel_new ? <Tag tone="gold">新渠道 · 首发必审 R3</Tag> : <Tag tone="ink">成熟渠道</Tag>}
              </div>
            ))}
          </div>

          <SystemDivider time="内容营销" summary="小红书/抖音发布留痕（R3 新渠道首发必审 / R15 直播双首发必审）" />
          {contents.slice(0, 8).map((ev) => (
            <Row key={ev.event_id} time={fmtTime(ev.context.time)} right={<Tag tone="go">已发布</Tag>}>
              <b className="text-ink2">{String(ev.decision.after?.title ?? "内容发布")}</b>
              <span className="text-ink3"> · {ev.context.channel ?? String(ev.decision.params?.platform ?? "")}</span>
            </Row>
          ))}
          <HBar label="竞对价格卡采集（30 天）" pct={Math.min(100, competitor.length * 3)} value={`${competitor.length} 次`} tone="bg-gold" />
          <Note>渠道「三失」治理：倒挂熔断（R17）与超售下架（R18）见 P11 价格健康；活动报名/图片卖点整改建议由 ota-operations 技能产出。</Note>
        </div>
      )}
    </Bridge>
  );
}
