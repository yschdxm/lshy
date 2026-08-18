'use client'

import { useState, useEffect, useRef } from 'react'
import { Download, RefreshCw, Users, Clock, TrendingUp, Star, Upload, Loader2, CheckCircle2, X } from 'lucide-react'
import { getBehaviorStats, uploadBehaviorExcel } from '@/lib/admin-api'
import type { BehaviorStats } from '@/lib/admin-api'
import { hourlyTraffic, behaviorFunnel, entryChannels, deviceDist, featureUsage } from '@/lib/admin-data'
import { PageHeader, Panel, DonutChart } from '@/components/admin/admin-ui'
import { cn } from '@/lib/utils'

const COST_COLORS: Record<string, string> = {
  ticket: 'var(--chart-1)', food: 'var(--chart-3)', shopping: 'var(--chart-2)',
  transport: 'var(--chart-4)', entertainment: 'var(--chart-5)',
}

export default function BehaviorPage() {
  const [data, setData] = useState<BehaviorStats & { updated_at?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchData = () => {
    setLoading(true)
    getBehaviorStats().then((d: any) => setData(d)).catch(() => setData(null)).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const r = await uploadBehaviorExcel(file)
      setToast(`上传成功！已聚合 ${r.visitors.toLocaleString()} 条游客数据`)
      setUploadOpen(false)
      fetchData()
    } catch (err: any) {
      setToast(err.message || '上传失败')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const updatedTime = data?.updated_at
    ? new Date(data.updated_at).toLocaleString('zh-CN')
    : null

  const handleExport = () => {
    const BASE = process.env.NEXT_PUBLIC_API_URL || ''
    window.open(`${BASE}/api/admin/behavior/export`, '_blank')
  }

  const maxHour = Math.max(...hourlyTraffic.map((t) => t.value))
  const channelTotal = entryChannels.reduce((a, b) => a + b.count, 0)

  // 统计卡片（Excel 真实数据优先）
  const statCards = data ? [
    { label: '累计游客', value: (data.total_visitors / 10000).toFixed(1) + '万', icon: Users, color: 'text-blue-500' },
    { label: '人均停留', value: data.avg_stay_hours + 'h', icon: Clock, color: 'text-teal-500' },
    { label: '人均消费', value: '¥' + data.avg_cost, icon: TrendingUp, color: 'text-orange-500' },
    { label: '综合满意度', value: data.avg_satisfaction + '/5', icon: Star, color: 'text-amber-500' },
  ] : []

  // 消费结构数据
  const costItems = data ? [
    { name: '门票', value: data.cost_breakdown.ticket, color: COST_COLORS.ticket },
    { name: '餐饮', value: data.cost_breakdown.food, color: COST_COLORS.food },
    { name: '购物', value: data.cost_breakdown.shopping, color: COST_COLORS.shopping },
    { name: '交通', value: data.cost_breakdown.transport, color: COST_COLORS.transport },
    { name: '娱乐', value: data.cost_breakdown.entertainment, color: COST_COLORS.entertainment },
  ] : []
  const costTotal = costItems.reduce((a, b) => a + b.value, 0)

  // 满意度分布
  const satItems = data?.satisfaction_dist || []

  // 年龄分布最大值
  const ageMax = data ? Math.max(...data.age_dist.map(a => a.value), 1) : 1

  return (
    <div>
      <PageHeader
        title="游客行为分析"
        desc={updatedTime ? `数据更新于 ${updatedTime} · 共 ${data?.total_visitors?.toLocaleString() || 0} 条游客记录` : '基于真实游客行为数据的多维度分析，辅助运营决策。'}
        actions={
          <>
            <button type="button" onClick={() => setUploadOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
              <Upload className="size-4" />上传数据
            </button>
            <button type="button" onClick={fetchData}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
              <RefreshCw className="size-4" />刷新
            </button>
            <button type="button" onClick={handleExport}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90">
              <Download className="size-4" />导出
            </button>
          </>
        }
      />

      {/* 统计卡片（Excel 聚合） */}
      {statCards.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-[0_4px_14px_rgb(80,120,200,0.05)]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <s.icon className={`size-5 ${s.color}`} />
              </div>
              <p className={`mt-2 text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 第一行：消费结构 + 满意度 + 年龄分布（Excel 数据） */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 消费结构 — 水平堆叠条 */}
        <Panel title="人均消费结构">
          {data ? (
            <div className="space-y-3">
              {costItems.map((c) => {
                const pct = Math.round(c.value / data.avg_cost * 100)
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <span className="size-2 rounded-full" style={{ background: c.color }} />
                        {c.name}
                      </span>
                      <span className="text-muted-foreground text-xs">Y{c.value} <span className="text-[10px]">({pct}%)</span></span>
                    </div>
                    <div className="h-6 w-full overflow-hidden rounded-md bg-secondary">
                      <div className="h-full rounded-md flex items-center justify-end pr-2 transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${c.color}, color-mix(in oklch, ${c.color}, white 30%))` }}>
                        <span className="text-[10px] font-medium text-white drop-shadow-sm">{pct}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  门票占比最高达 {Math.round(data.cost_breakdown.ticket / data.avg_cost * 100)}%，二次消费（餐饮+购物+娱乐）合计 Y{data.cost_breakdown.food + data.cost_breakdown.shopping + data.cost_breakdown.entertainment}，提升空间显著
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">加载中...</p>
          )}
        </Panel>

        {/* 满意度环形图 */}
        <Panel title="满意度分布（Excel 14万条评分）">
          {data ? (
            <div className="flex flex-col items-center">
              <DonutChart
                data={satItems.map((s, i) => {
                  const colors = ['#EF4444','#F97316','#EAB308','#84CC16','#22C55E']  // 红→橙→黄→黄绿→绿
                  return { name: s.name, count: s.value, color: colors[i] || colors[0] }
                })}
                total={satItems.reduce((a, b) => a + b.value, 0)}
                size={140}
              />
              <ul className="mt-3 flex flex-col gap-1.5 w-full">
                {satItems.map((s, i) => {
                  const colors = ['#EF4444','#F97316','#EAB308','#84CC16','#22C55E']
                  return (
                  <li key={s.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: colors[i] || colors[0] }} />
                      {s.name}
                    </span>
                    <span className="text-muted-foreground">{s.value.toLocaleString()}条</span>
                  </li>
                )
                })}
              </ul>
            </div>
          ) : null}
        </Panel>

        {/* 年龄分布 + 结伴规模 */}
        <Panel title="游客年龄分布">
          {data ? (
            <div className="space-y-4">
              <div className="flex items-end gap-1 h-32">
                {data.age_dist.map((a) => (
                  <div key={a.name} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-medium text-muted-foreground">{(a.value/1000).toFixed(1)}k</span>
                    <div className="w-full rounded-t-md bg-primary/70" style={{ height: `${(a.value/ageMax)*100}%` }} />
                    <span className="text-[10px] text-muted-foreground">{a.name}</span>
                  </div>
                ))}
              </div>
              {/* 结伴规模 */}
              <div>
                <p className="text-xs font-medium text-foreground mb-2">结伴规模</p>
                <div className="flex gap-1">
                  {data.group_dist.map((g) => (
                    <div key={g.name} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-xs font-medium text-foreground">{(g.value / data.total_visitors * 100).toFixed(1)}%</span>
                      <div className="w-full rounded-sm bg-primary/50" style={{ height: `${Math.max(4, g.value / Math.max(...data.group_dist.map(x=>x.value)) * 40)}px` }} />
                      <span className="text-[10px] text-muted-foreground">{g.name}人</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </Panel>
      </div>

      {/* 第二行：景点类型热度（Excel） + 保留静态模块 */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 景点类型热度（Excel 数据） */}
        <Panel title="景点类型热度（Excel Top 8）">
          {data ? (
            <ul className="flex flex-col gap-3">
              {data.type_dist.slice(0, 8).map((t, i) => (
                <li key={t.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className={cn('flex size-5 items-center justify-center rounded-md text-xs font-bold', i < 3 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground')}>{i + 1}</span>
                      <span className="font-medium text-foreground">{t.name}</span>
                    </span>
                    <span className="text-muted-foreground">{t.value.toLocaleString()}人次</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${t.value / data.type_dist[0].value * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>

        {/* 分时段客流 — SVG 面积图 */}
        <Panel title="分时段客流分布">
          {(() => {
            const w = 460; const h = 160; const pad = 28
            const stepX = (w - pad * 2) / (hourlyTraffic.length - 1)
            const scaleY = (v: number) => h - pad - (v / maxHour) * (h - pad * 2)
            const points = hourlyTraffic.map((t, i) => `${pad + i * stepX},${scaleY(t.value)}`).join(' ')
            const areaPath = `M${pad},${h - pad} L${points} L${pad + (hourlyTraffic.length - 1) * stepX},${h - pad} Z`
            const linePath = `M${points}`

            return (
              <div className="relative">
                <div className="flex items-center gap-4 mb-2 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="size-2.5 rounded-full bg-primary/80" />
                    入园客流
                  </span>
                  <span className="text-muted-foreground">
                    峰值 {maxHour.toLocaleString()} 人次 · {hourlyTraffic.find(t => t.value === maxHour)?.label}:00
                  </span>
                </div>
                <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="分时段客流趋势">
                  <defs>
                    <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {[0.25, 0.5, 0.75, 1].map((g) => (
                    <line key={g} x1={pad} x2={w - pad}
                      y1={h - pad - g * (h - pad * 2)} y2={h - pad - g * (h - pad * 2)}
                      stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
                  ))}
                  <path d={areaPath} fill="url(#flowGrad)" />
                  <path d={linePath} fill="none" stroke="var(--chart-1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {hourlyTraffic.map((t, i) => {
                    const cx = pad + i * stepX; const cy = scaleY(t.value)
                    return (
                      <g key={t.label}>
                        {t.value === maxHour && <circle cx={cx} cy={cy} r="10" fill="var(--chart-1)" opacity="0.12" />}
                        <circle cx={cx} cy={cy} r={t.value === maxHour ? 4 : 2.5} fill="var(--chart-1)" stroke="#fff" strokeWidth="1.5" />
                        <text x={cx} y={h - 8} textAnchor="middle" fill="var(--muted-foreground)" fontSize="10">{t.label}:00</text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            )
          })()}
        </Panel>

        {/* 行为漏斗（保留静态） */}
        <Panel title="行为转化漏斗">
          <ul className="flex flex-col gap-2">
            {behaviorFunnel.map((f, i) => (
              <li key={f.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-foreground">{f.name}</span>
                  <span className="text-muted-foreground">{f.value.toLocaleString()}（{f.pct}%）</span>
                </div>
                <div className="h-5 w-full overflow-hidden rounded-md bg-secondary">
                  <div className="flex h-full items-center rounded-md" style={{
                    width: `${f.pct}%`,
                    background: `color-mix(in oklch, var(--chart-1) ${100 - i * 12}%, var(--chart-3))`,
                  }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* 第三行：渠道 + 设备 + 功能热度（全部保留静态） */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="入园渠道分布">
          <div className="flex flex-col items-center">
            <DonutChart data={entryChannels.map((c) => ({ name: c.name, count: c.count, color: c.color }))} total={channelTotal} totalLabel="总入园" size={140} />
            <ul className="mt-3 flex w-full flex-col gap-1.5">
              {entryChannels.map((c) => (
                <li key={c.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: c.color }} />{c.name}</span>
                  <span className="text-muted-foreground">{c.count.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel title="设备占比">
          <ul className="flex flex-col gap-3">
            {deviceDist.map((d) => (
              <li key={d.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{d.name}</span>
                  <span className="text-muted-foreground">{d.pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${d.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
            建议持续优化小程序与移动端扫码入园体验，提升游客满意度。
          </div>
        </Panel>

        <Panel title="功能使用热度">
          <ul className="flex flex-col gap-3">
            {featureUsage.map((f, i) => (
              <li key={f.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={cn('flex size-5 items-center justify-center rounded-md text-xs font-bold', i < 3 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground')}>{i + 1}</span>
                    <span className="font-medium text-foreground">{f.name}</span>
                  </span>
                  <span className="text-muted-foreground">{f.count.toLocaleString()}次</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${f.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* 上传弹窗 */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setUploadOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">上传行为数据</h3>
              <button onClick={() => setUploadOpen(false)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                <X className="size-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">上传景区票务系统的 Excel 数据文件，系统将自动聚合生成分析报表。支持与现有数据相同格式的 .xlsx 文件。</p>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-4 py-10 text-center transition-colors hover:border-primary/50">
              {uploading ? (
                <Loader2 className="size-8 animate-spin text-primary" />
              ) : (
                <Upload className="size-8 text-primary" />
              )}
              <p className="text-sm font-medium text-foreground">
                {uploading ? '正在聚合数据...' : '点击选择 .xlsx 文件'}
              </p>
              <p className="text-xs text-muted-foreground">支持 14 万行级别的数据文件</p>
              <input ref={fileRef} type="file" accept=".xlsx" onChange={handleUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
