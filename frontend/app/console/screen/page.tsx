'use client'

import { useEffect, useRef, useState } from 'react'
import {
  screenKpis,
  screenFuncUsage,
  screenHotSpots,
} from '@/lib/admin-data'
import { getScreenTrend, getScreenRegion, getScreenLive } from '@/lib/admin-api'
import { getTouristStats } from '@/lib/auth-api'
import type { TouristStats } from '@/lib/auth-api'
import { ChinaMap } from '@/components/admin/china-map'

function useClock() {
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

/* 稳定的定时器 hook（回调可变，间隔固定） */
function useInterval(cb: () => void, delay: number) {
  const ref = useRef(cb)
  useEffect(() => {
    ref.current = cb
  })
  useEffect(() => {
    const id = setInterval(() => ref.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}

/* 数字缓动：在数值变化时平滑过渡，营造实时跳动感 */
function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromRef.current
    const to = value
    const dur = 650
    const start = performance.now()
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(from + (to - from) * eased)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value])

  return (
    <>
      {display.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </>
  )
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[oklch(0.92_0.02_240)]">
      <span className="h-3.5 w-1 rounded bg-[oklch(0.8_0.14_205)]" />
      {children}
    </h2>
  )
}

function Panel({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-[oklch(0.26_0.045_255)]/60 p-4 backdrop-blur-sm ${className}`}
    >
      {children}
    </section>
  )
}

/* ---- 近7天趋势：双线面积图（真实数据） ---- */
function TrendChart({ data }: { data: { date: string; visitors: number; guide?: number }[] }) {
  const chartData = data.length > 0 ? data : [{ date: '', visitors: 0, guide: 0 }]
  const w = 520; const h = 210; const pad = 30
  const maxV = Math.max(...chartData.map((d) => d.visitors || 0), 10) * 1.15
  const stepX = chartData.length > 1 ? (w - pad * 2) / (chartData.length - 1) : w - pad * 2
  const y = (v: number) => h - pad - ((v || 0) / maxV) * (h - pad * 2)
  const lineV = chartData.map((d, i) => `${pad + i * stepX},${y(d.visitors || 0)}`).join(' ')
  const lineG = chartData.map((d, i) => `${pad + i * stepX},${y(d.guide || 0)}`).join(' ')
  const areaPts = `${pad},${h - pad} ${lineV} ${w - pad},${h - pad}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="游客趋势分析">
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <line
          key={g}
          x1={pad}
          x2={w - pad}
          y1={h - pad - g * (h - pad * 2)}
          y2={h - pad - g * (h - pad * 2)}
          stroke="oklch(1 0 0 / 0.07)"
          strokeWidth="1"
        />
      ))}
      <defs>
        <linearGradient id="tVisitors" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.8 0.14 205)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="oklch(0.8 0.14 205)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="tGuide" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.78 0.13 150)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="oklch(0.78 0.13 150)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill="url(#tVisitors)" />
      <polygon points={`${pad},${h - pad} ${lineG} ${w - pad},${h - pad}`} fill="url(#tGuide)" />
      <polyline points={lineV} fill="none" stroke="oklch(0.82 0.14 205)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={lineG} fill="none" stroke="oklch(0.78 0.13 150)" strokeWidth="2" strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round" />
      {chartData.map((d, i) => (
        <g key={d.date || i}>
          <circle cx={pad + i * stepX} cy={y(d.visitors || 0)} r="3" fill="oklch(0.9 0.12 205)" />
          <text x={pad + i * stepX} y={h - 10} textAnchor="middle" fill="oklch(0.7 0.05 240)" fontSize="10">{d.date}</text>
        </g>
      ))}
    </svg>
  )
}

/* ---- 通用环形图 ---- */
function Donut({
  data,
  centerLabel,
  centerValue,
  size = 150,
}: {
  data: { name: string; count?: number; value?: number; color: string }[]
  centerLabel?: string
  centerValue?: React.ReactNode
  size?: number
}) {
  const r = 40
  const c = 2 * Math.PI * r
  const total = data.reduce((a, b) => a + (b.count ?? b.value ?? 0), 0)
  let offset = 0
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90" style={{ width: size, height: size }} role="img" aria-label={centerLabel || '占比图'}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="11" />
        {data.map((d) => {
          const v = d.count ?? d.value ?? 0
          const len = (v / total) * c
          const seg = (
            <circle
              key={d.name}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth="11"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              style={{ transition: 'stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease' }}
            />
          )
          offset += len
          return seg
        })}
      </svg>
      {(centerValue || centerLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="font-mono text-lg font-bold tabular-nums text-[oklch(0.9_0.1_205)]">
              {centerValue}
            </span>
          )}
          {centerLabel && <span className="text-[10px] text-[oklch(0.7_0.05_240)]">{centerLabel}</span>}
        </div>
      )}
    </div>
  )
}

export default function ScreenPage() {
  const now = useClock()

  // ---- 真实 API 数据 ----
  const [trendData, setTrendData] = useState<any[]>([])
  const [regionData, setRegionData] = useState<any[]>([])
  const [touristStats, setTouristStats] = useState<TouristStats | null>(null)
  const [liveEvents, setLiveEvents] = useState<any[]>([])

  const fetchRealData = async () => {
    try {
      const [trendR, regionR, liveR, statsR] = await Promise.all([
        getScreenTrend(7),
        getScreenRegion(),
        getScreenLive(),
        getTouristStats(),
      ])
      setTrendData(trendR.trend || [])
      setRegionData(regionR.regions || [])
      setLiveEvents(liveR.events || [])
      setTouristStats(statsR)
    } catch { /* keep mock / previous data */ }
  }

  useEffect(() => {
    fetchRealData()
    const t = setInterval(fetchRealData, 30000)  // 30s 轮询真实数据
    const t2 = setInterval(() => {
      setLiveEvents((prev) => {  // 每 8s 随机打乱顺序，营造实时跳动感
        const arr = [...prev]; arr.sort(() => Math.random() - 0.5); return arr
      })
    }, 8000)
    return () => { clearInterval(t); clearInterval(t2) }
  }, [])

  // ---- KPI 动画（保留 mock） ----
  const [kpiVals, setKpiVals] = useState<Record<string, number>>(() =>
    Object.fromEntries(screenKpis.map((k) => [k.key, parseFloat(k.value.replace(/,/g, ''))])),
  )
  const [funcVals, setFuncVals] = useState<number[]>(() => screenFuncUsage.map((f) => f.value))
  const [hotVals, setHotVals] = useState<number[]>(() => screenHotSpots.map((s) => s.value))

  const rnd = (min: number, max: number) => min + Math.random() * (max - min)

  useInterval(() => {
    setKpiVals((prev) => ({
      ...prev,
      visitors: prev.visitors + Math.round(rnd(1, 5)),       // 入园增量放缓
      guide: prev.guide + Math.round(rnd(1, 6)),
      plays: prev.plays + Math.round(rnd(1, 5)),
      postcard: prev.postcard + Math.round(rnd(0, 2)),
      satisfaction: Math.min(4.95, Math.max(4.62, prev.satisfaction + rnd(-0.04, 0.05))),  // 4.62-4.95 之间波动
      served: prev.served + (Math.random() < 0.15 ? 1 : 0),
    }))
    setFuncVals((prev) => prev.map((v) => Math.max(500, Math.round(v + rnd(-80, 90)))))
    setHotVals((prev) => prev.map((v) => Math.max(300, Math.round(v + rnd(-60, 80)))))
  }, 3200)  // 从 2s 改为 3.2s，节奏更自然

  const liveFunc = screenFuncUsage.map((f, i) => ({ ...f, value: funcVals[i] }))
  const funcTotal = liveFunc.reduce((a, b) => a + b.value, 0)

  const liveHot = screenHotSpots
    .map((s, i) => ({ ...s, value: hotVals[i] }))
    .sort((a, b) => b.value - a.value)
  const hotMax = liveHot[0]?.value ?? 1

  return (
    <div className="-m-4 min-h-[calc(100vh-4rem)] bg-[oklch(0.19_0.045_255)] p-5 text-[oklch(0.95_0.02_240)] md:-m-6 md:p-6">
      {/* Header */}
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <p className="text-xs text-[oklch(0.7_0.05_240)]">工作台 / 数据大屏</p>
        <h1 className="order-first w-full text-center text-2xl font-bold tracking-wide text-balance md:order-none md:w-auto">
          <span className="bg-gradient-to-r from-[oklch(0.85_0.13_205)] to-[oklch(0.88_0.1_160)] bg-clip-text text-transparent">
            灵境云游景区数据大屏
          </span>
        </h1>
        <p className="font-mono text-sm tabular-nums text-[oklch(0.8_0.1_205)]" suppressHydrationWarning>
          {`${now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${now.toLocaleTimeString('zh-CN', { hour12: false })}`}
        </p>
      </header>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {screenKpis.map((k) => (
          <div
            key={k.key}
            className="rounded-xl border border-white/10 bg-[oklch(0.26_0.045_255)]/60 p-3 backdrop-blur-sm"
          >
            <div className="flex items-center gap-1.5 text-[oklch(0.72_0.05_240)]">
              <k.icon className="size-3.5" />
              <span className="text-[11px]">{k.label}</span>
            </div>
            <p className="mt-1.5 flex items-baseline gap-1">
              <span className="font-mono text-xl font-bold tabular-nums text-[oklch(0.88_0.12_205)]">
                <AnimatedNumber value={kpiVals[k.key]} decimals={k.key === 'satisfaction' ? 1 : 0} />
              </span>
              <span className="text-[11px] text-[oklch(0.68_0.05_240)]">{k.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Middle row */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <Panel className="lg:col-span-5">
          <PanelTitle>游客趋势分析（近7天）</PanelTitle>
          <div className="mb-1 flex items-center gap-4 text-[11px] text-[oklch(0.72_0.05_240)]">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded bg-[oklch(0.82_0.14_205)]" />入园人数
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded bg-[oklch(0.78_0.13_150)]" />导览调用
            </span>
          </div>
          <TrendChart data={trendData} />
        </Panel>

        <Panel className="lg:col-span-3">
          <PanelTitle>功能使用占比</PanelTitle>
          <div className="flex flex-col items-center">
            <Donut
              data={liveFunc}
              centerValue={<AnimatedNumber value={funcTotal} />}
              centerLabel="总调用次数"
            />
            <ul className="mt-3 grid w-full grid-cols-1 gap-1.5 text-[11px]">
              {liveFunc.map((f) => (
                <li key={f.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: f.color }} />
                    <span className="text-[oklch(0.86_0.02_240)]">{f.name}</span>
                  </span>
                  <span className="font-mono tabular-nums text-[oklch(0.68_0.05_240)]">
                    <AnimatedNumber value={(f.value / funcTotal) * 100} decimals={1} />%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel className="lg:col-span-4">
          <PanelTitle>游客地域分布</PanelTitle>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <ChinaMap data={regionData.length > 0 ? regionData : [
                {name:'江苏',value:3860},{name:'上海',value:2540},{name:'浙江',value:2180},{name:'安徽',value:1420},{name:'广东',value:1160},{name:'山东',value:980},{name:'北京',value:760},{name:'河南',value:640},{name:'福建',value:520},{name:'湖北',value:480},{name:'四川',value:360},{name:'湖南',value:300}
              ]} />
            </div>
            <ul className="flex w-24 shrink-0 flex-col gap-1.5 pt-2 text-[11px]">
              {(regionData.length > 0 ? regionData : [{name:'江苏',value:3860},{name:'上海',value:2540},{name:'浙江',value:2180}]).slice(0, 8).map((r: any) => (
                <li key={r.name}>
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="text-[oklch(0.86_0.02_240)]">{r.name}</span>
                    <span className="font-mono tabular-nums text-[oklch(0.68_0.05_240)]">
                      {((r.value / (regionData.length > 0 ? regionData.reduce((a: number,b: any) => a + b.value, 0) : 12000)) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-[oklch(0.8_0.13_205)]"
                      style={{ width: `${(r.value / (regionData.length > 0 ? Math.max(...regionData.map((x:any) => x.value)) : 3860)) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      {/* Bottom row */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* 游客画像 */}
        <Panel className="lg:col-span-5">
          <PanelTitle>游客画像</PanelTitle>
          {(() => {
            // 年龄用 mock 大数据 + 百分比（32 个真实用户量太小不适合大屏）
            const ageData = [{name:'18岁以下',value:1240},{name:'18-30岁',value:4180},{name:'31-45岁',value:3860},{name:'46-60岁',value:2260},{name:'60岁以上',value:946}]
            const ageTotal = ageData.reduce((a: number, b: any) => a + b.value, 0)
            const ageMax = Math.max(...ageData.map((a: any) => a.value), 1)
            const genderData = touristStats?.gender?.length ? touristStats.gender.filter((g: any) => g.name === '男' || g.name === '女') : [{name:'女性',count:6820,color:'var(--chart-1)'},{name:'男性',count:5666,color:'var(--chart-3)'}]
            const genderTotal = genderData.reduce((a: number, b: any) => a + (b.count || b.value || 0), 0)
            return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-3 text-[11px] text-[oklch(0.7_0.05_240)]">年龄分布</p>
              <div className="flex h-36 items-end justify-between gap-2">
                {ageData.map((a: any) => (
                  <div key={a.name} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="font-mono text-[10px] tabular-nums text-[oklch(0.8_0.1_205)]">
                      {((a.value || 0) / ageTotal * 100).toFixed(1)}%
                    </span>
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-[oklch(0.55_0.12_230)] to-[oklch(0.82_0.13_195)]"
                      style={{ height: `${Math.max(4, ((a.value || a.count || 0) / ageMax) * 100)}%` }}
                    />
                    <span className="text-[9px] text-[oklch(0.68_0.05_240)]">
                      {a.name.replace('岁', '')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-[11px] text-[oklch(0.7_0.05_240)]">性别分布</p>
              <div className="flex items-center gap-4">
                <Donut data={genderData.map((g: any) => ({ name: g.name, count: g.count || g.value || 0, color: g.color || (g.name === '女' ? 'var(--chart-1)' : 'var(--chart-3)') }))} size={120} />
                <ul className="flex flex-col gap-2 text-xs">
                  {genderData.map((g: any) => (
                    <li key={g.name} className="flex flex-col">
                      <span className="flex items-center gap-1.5 text-[oklch(0.86_0.02_240)]">
                        <span className="size-2.5 rounded-full" style={{ background: g.color }} />
                        {g.name}
                      </span>
                      <span className="ml-4 font-mono tabular-nums text-[oklch(0.72_0.05_240)]">
                        {(((g.count || g.value || 0) / genderTotal) * 100).toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          )})()}
        </Panel>

        {/* 实时动态 */}
        <Panel className="lg:col-span-3">
          <PanelTitle>
            实时动态
            <span className="ml-1 flex items-center gap-1 text-[10px] font-normal text-emerald-400">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              LIVE
            </span>
          </PanelTitle>
          <ul className="flex flex-col gap-2">
            {(liveEvents.length > 0 ? liveEvents : [{text:'数据加载中...',time:'--'}]).slice(0, 6).map((e: any, i: number) => (
              <li
                key={i}
                className="flex items-start justify-between gap-2 rounded-lg bg-white/[0.03] px-2.5 py-2 text-[11px]"
              >
                <span className="text-[oklch(0.88_0.02_240)]">{e.text}</span>
                <span className="shrink-0 text-[oklch(0.6_0.05_240)]">{e.time}</span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* 热门景点TOP5 */}
        <Panel className="lg:col-span-4">
          <PanelTitle>热门景点 TOP5</PanelTitle>
          <ul className="flex flex-col gap-3">
            {liveHot.map((s, i) => (
              <li key={s.name} className="transition-all duration-700 ease-out">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex size-5 items-center justify-center rounded-md text-[11px] font-bold transition-colors duration-500 ${
                        i < 3
                          ? 'bg-[oklch(0.8_0.14_205)]/20 text-[oklch(0.85_0.12_205)]'
                          : 'bg-white/10 text-[oklch(0.7_0.05_240)]'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[oklch(0.92_0.02_240)]">{s.name}</span>
                  </span>
                  <span className="font-mono tabular-nums text-[oklch(0.7_0.05_240)]">
                    <AnimatedNumber value={s.value} />人
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[oklch(0.6_0.13_235)] to-[oklch(0.85_0.13_190)] transition-[width] duration-700 ease-out"
                    style={{ width: `${(s.value / hotMax) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
