'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Database, RefreshCw, Download, MessagesSquare, Landmark, Images, ArrowRight,
  Users, Heart, MapPin, FileText, Loader2,
} from 'lucide-react'
import { getDashboard } from '@/lib/admin-api'
import type { DashboardOverview } from '@/lib/admin-api'
import { workbenchStats, trafficTrend as seedTrend, hotSpotStats as seedHot } from '@/lib/admin-data'
import { PageHeader, StatCard, Panel } from '@/components/admin/admin-ui'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---- 常量 ----

const periods = ['近7天', '近30天', '本季度']
const PERIOD_DAYS: Record<string, number> = { '近7天': 7, '近30天': 30, '本季度': 90 }

const todoToneMeta: Record<string, string> = {
  warn: 'text-amber-600 bg-amber-50',
  info: 'text-blue-600 bg-blue-50',
  danger: 'text-rose-600 bg-rose-50',
}

const todoLinkMap: Record<string, string> = {
  docs: '/console/knowledge',
  feedback: '/console/satisfaction',
  route: '/console/route',
}

const quickLinks = [
  { label: '知识库管理', href: '/console/knowledge', icon: Database, tint: 'text-blue-500 bg-blue-50' },
  { label: '智能问答管理', href: '/console/qa', icon: MessagesSquare, tint: 'text-teal-500 bg-teal-50' },
  { label: '景点讲解管理', href: '/console/spots', icon: Landmark, tint: 'text-emerald-500 bg-emerald-50' },
  { label: 'AI明信片管理', href: '/console/postcard', icon: Images, tint: 'text-orange-500 bg-orange-50' },
]

// 后端返回的 icon 字符串 → Lucide 组件映射
const ICON_MAP: Record<string, LucideIcon> = {
  Users, MessageSquare: MessagesSquare, Landmark, FileText, Heart, MapPin,
}

// ============================================================
export default function WorkbenchPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [period, setPeriod] = useState('近7天')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboard = useCallback(() => {
    setLoading(true)
    getDashboard(PERIOD_DAYS[period])
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [period])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const handleRefresh = () => {
    setRefreshing(true)
    getDashboard(PERIOD_DAYS[period])
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setRefreshing(false))
  }

  // ---- 数据适配 ----

  // API 数据优先，无数据时降级到 mock
  const apiStats = data?.stats
  const stats = apiStats?.length
    ? apiStats.map((s) => ({
        ...s,
        icon: (ICON_MAP[s.icon as string] || FileText) as any,
        trend: typeof s.trend === 'string' ? { value: s.trend as string, up: true } : (s.trend || undefined),
      }))
    : workbenchStats

  // 趋势线：API 返回 {date, chats}，mock 是 {label, visitors}
  const apiTrend = data?.trend
  const trafficTrend: { date: string; label: string; chats: number }[] = apiTrend?.length
    ? apiTrend.map((t) => ({ ...t, label: t.date }))
    : seedTrend.map((t) => ({ date: t.label, label: t.label, chats: t.visitors }))

  // 热门景点：保留静态 mock（展示价值更高）
  const hotSpotStats = seedHot

  // 待办事项：API 优先
  const workbenchTodos = data?.todos?.length ? data.todos : []

  // ---- SVG 趋势图数据 ----
  const maxVisitors = Math.max(...trafficTrend.map((t) => t.chats || 0), 1)
  const w = 640
  const h = 200
  const pad = 24
  const stepX = trafficTrend.length > 1 ? (w - pad * 2) / (trafficTrend.length - 1) : w - pad * 2
  const scaleY = (v: number) => h - pad - (v / maxVisitors) * (h - pad * 2)

  // 根据数据量决定标签间隔：≤14 全显示，≤31 每 3 个，>31 每 7 个
  const labelInterval = trafficTrend.length <= 14 ? 1 : trafficTrend.length <= 31 ? 3 : 7

  const linePath = () =>
    trafficTrend
      .map((t, i) => `${pad + i * stepX},${scaleY(t.chats || 0)}`)
      .join(' ')

  return (
    <div>
      <PageHeader
        title="工作台"
        desc="灵境云游 AI 数字人导览系统运营总览，掌握景区实时数据与待办事项。"
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                const toast = document.createElement('div')
                toast.className = 'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg'
                toast.textContent = '导出功能开发中'
                document.body.appendChild(toast)
                setTimeout(() => toast.remove(), 2000)
              }}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <Download className="size-4" />
              导出报表
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
            >
              <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
              刷新数据
            </button>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {loading && !data ? (
          <div className="col-span-full flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin mr-2" />
            加载中...
          </div>
        ) : (
          stats.map((s) => (
            <StatCard
              key={s.key}
              label={s.label}
              value={String(s.value)}
              trend={s.trend as { value: string; up: boolean } | undefined}
              icon={s.icon as LucideIcon}
              tint={typeof s.tint === 'string' && !s.tint.includes('bg-') ? `bg-${s.tint.split(' ')[0]?.replace('text-','')}-50 ${s.tint}` : (s.tint as string)}
            />
          ))
        )}
      </div>

      {/* Charts row */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Traffic trend */}
        <Panel
          className="lg:col-span-2"
          title="访客与问答趋势"
          action={
            <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
              {periods.map((p) => (
                <button key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    period === p
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          }
        >
          <div className="mb-3 flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2.5 rounded-full" style={{ background: 'var(--chart-1)' }} />
              每日服务人次
            </span>
          </div>
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="访客与问答趋势图">
            {[0.25, 0.5, 0.75, 1].map((g) => (
              <line key={g}
                x1={pad}
                x2={w - pad}
                y1={h - pad - g * (h - pad * 2)}
                y2={h - pad - g * (h - pad * 2)}
                stroke="var(--border)"
                strokeWidth="1"
              />
            ))}
            <polyline points={linePath()} fill="none" stroke="var(--chart-1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {trafficTrend.map((t, i) => {
              const showLabel = i % labelInterval === 0 || i === trafficTrend.length - 1
              return (
                <g key={t.date || i}>
                  <circle cx={pad + i * stepX} cy={scaleY(t.chats || 0)} r={showLabel ? 3 : 1.5} fill="var(--chart-1)" />
                  {showLabel && (
                    <text x={pad + i * stepX} y={h - 6} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>
                      {t.label}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </Panel>

        {/* Hot spots */}
        <Panel title="热门景点讲解 Top5">
          <ul className="flex flex-col gap-4">
            {hotSpotStats.map((s, i) => (
              <li key={s.name || i}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        'flex size-5 items-center justify-center rounded-md text-xs font-bold',
                        i < 3 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="font-medium text-foreground">{s.name}</span>
                  </span>
                  <span className="text-muted-foreground">{s.plays.toLocaleString()}次</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Bottom row */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Todos */}
        <Panel
          className="lg:col-span-2"
          title="待办事项"
          action={<span className="text-xs text-muted-foreground">{workbenchTodos.length} 项待处理</span>}
        >
          {workbenchTodos.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              暂无待办事项
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {workbenchTodos.map((t, i) => (
                <li key={t.key || i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn('shrink-0 rounded-md px-2 py-0.5 text-xs font-medium', todoToneMeta[t.tone] || todoToneMeta.info)}>
                      {t.tag}
                    </span>
                    <span className="truncate text-sm text-foreground">{t.title}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const href = todoLinkMap[t.key]
                        if (href) router.push(href)
                      }}
                      className="flex items-center gap-1 text-sm font-medium text-primary transition-opacity hover:opacity-80"
                    >
                      处理
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Quick links */}
        <Panel title="快捷入口">
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((q) => (
              <Link
                key={q.label}
                href={q.href}
                className="flex flex-col items-start gap-2 rounded-xl border border-border p-3 transition-colors hover:bg-secondary"
              >
                <span className={cn('flex size-9 items-center justify-center rounded-xl', q.tint)}>
                  <q.icon className="size-5" />
                </span>
                <span className="text-sm font-medium text-foreground">{q.label}</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
