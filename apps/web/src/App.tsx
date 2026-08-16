import { useEffect, useState } from 'react'
import { trpc } from './lib/trpc'

type Health = { ping?: string; meta?: { name: string; product: string; prd: string; phase: string }; db?: boolean }

const PAGES = [
  ['PI-1', '工作台首页（派遣中心）'],
  ['PI-2', '任务线程会话'],
  ['PI-3', '审批队列 + IM 审批卡片'],
  ['PI-4', '围栏配置'],
  ['PI-5', '数字员工名册与角色档案'],
] as const

export default function App() {
  const [h, setH] = useState<Health>({})
  const [err, setErr] = useState('')

  useEffect(() => {
    Promise.all([trpc.ping.query(), trpc.meta.query(), trpc.dbHealth.query()])
      .then(([ping, meta, db]) => setH({ ping, meta, db: db.ok }))
      .catch((e: Error) => setErr(e.message))
  }, [])

  return (
    <div className="min-h-screen bg-[#15171c] text-[#cfd6de] p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-[#e8ecf1]">小WorkLoom · 企业智能执行中枢</h1>
          <p className="text-sm text-[#8b94a0] mt-1">Phase 1 环境初始化骨架 · PRD V3.0</p>
        </header>

        <section className="rounded-lg border border-[#2a2f37] bg-[#1d2026] p-4">
          <h2 className="text-sm font-semibold text-[#8b94a0] mb-3">后端连通自检</h2>
          {err ? (
            <p className="text-[#ef6a6a] text-sm">连接失败：{err}（请确认 server 已启动）</p>
          ) : (
            <ul className="text-sm space-y-1">
              <li>tRPC ping：<span className="text-[#4fd6a3]">{h.ping ?? '…'}</span></li>
              <li>
                产品元信息：{h.meta ? `${h.meta.name} / ${h.meta.product} / PRD ${h.meta.prd}` : '…'}
              </li>
              <li>
                数据库：
                {h.db === undefined ? '…' : h.db
                  ? <span className="text-[#4fd6a3]">已连接（PG17 + pgvector）</span>
                  : <span className="text-[#ef6a6a]">未连接</span>}
              </li>
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-[#2a2f37] bg-[#1d2026] p-4">
          <h2 className="text-sm font-semibold text-[#8b94a0] mb-3">MVP 五页面（Phase 3 交付）</h2>
          <ul className="text-sm space-y-2">
            {PAGES.map(([id, name]) => (
              <li key={id} className="flex items-center gap-3">
                <span className="inline-block px-2 py-0.5 rounded-full text-xs border border-[#3a4149] text-[#9aa4b0]">{id}</span>
                <span>{name}</span>
                <span className="text-xs text-[#5f6b7a]">待开发</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
