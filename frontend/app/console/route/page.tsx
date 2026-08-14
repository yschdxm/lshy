'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Save, Clock, Users, MapPin, SlidersHorizontal, RefreshCw, Loader2, Timer, Star } from 'lucide-react'
import { getRouteStats, getRouteList } from '@/lib/admin-api'
import type { RouteStats, RouteItem } from '@/lib/admin-api'
import {
  routeDurationOptions, routeThemeOptions, routeThemeTone,
  routeGenRules as ruleSeed, routeSpotPool as poolSeed,
  type RouteRule, type RouteSpot,
} from '@/lib/admin-data'
import { PageHeader, Panel, Pagination } from '@/components/admin/admin-ui'
import { cn } from '@/lib/utils'

const TABS = ['全部', '个性化推荐', '一日游', '半日游', '深度游'] as const

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', on ? 'bg-primary' : 'bg-muted-foreground/30')}
      aria-pressed={on}>
      <span className={cn('absolute top-0.5 size-4 rounded-full bg-card shadow transition-all', on ? 'left-[18px]' : 'left-0.5')} />
    </button>
  )
}

export default function RoutePage() {
  const [stats, setStats] = useState<RouteStats | null>(null)
  const [records, setRecords] = useState<RouteItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<string>('全部')
  const [page, setPage] = useState(1)
  const pageSize = 8

  // 配置（localStorage 持久化）
  const [rules, setRules] = useState<RouteRule[]>(() => {
    try { const s = localStorage.getItem('route_rules'); if (s) return JSON.parse(s) } catch {}
    return ruleSeed
  })
  const [pool, setPool] = useState<RouteSpot[]>(() => {
    try { const s = localStorage.getItem('route_pool'); if (s) return JSON.parse(s) } catch {}
    return poolSeed
  })
  const [toast, setToast] = useState<string | null>(null)
  const showToast = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(null), 2000) }, [])

  // 获取统计
  useEffect(() => { getRouteStats().then(setStats).catch(() => {}) }, [])

  // 获取记录列表
  const fetchRecords = useCallback(() => {
    setLoading(true)
    const params: any = { page, page_size: pageSize }
    if (tab !== '全部') params.route_type = tab
    getRouteList(params)
      .then((d) => { setRecords(d.items || []); setTotal(d.total) })
      .catch(() => showToast('获取记录失败'))
      .finally(() => setLoading(false))
  }, [page, tab])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const toggleRule = (key: string) => {
    setRules((prev) => prev.map((r) => (r.key === key ? { ...r, enabled: !r.enabled } : r)))
  }
  const toggleSpot = (id: string) => {
    setPool((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)))
  }
  const handleSave = () => {
    localStorage.setItem('route_rules', JSON.stringify(rules))
    localStorage.setItem('route_pool', JSON.stringify(pool))
    showToast('配置已保存')
  }

  return (
    <div>
      <PageHeader
        title="个性化路线管理"
        desc="个性化路线由 AI 依据游客偏好实时规划。在此维护可调度景点池与规划规则，并监控生成记录。"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => showToast('模拟生成功能开发中')}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
              <Sparkles className="size-4" />模拟生成
            </button>
            <button type="button" onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90">
              <Save className="size-4" />保存配置
            </button>
          </div>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: '今日生成路线', value: stats ? String(stats.today) : '—', icon: Sparkles, tint: 'text-blue-500' },
          { label: '路线总数', value: stats ? String(stats.total) : '—', icon: MapPin, tint: 'text-emerald-500' },
          { label: '生成成功率', value: stats ? `${stats.success_rate}%` : '—', icon: Timer, tint: 'text-teal-500' },
          { label: '平均满意度', value: stats ? String(stats.avg_satisfaction) : '—', icon: Star, tint: 'text-amber-500' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-[0_4px_14px_rgb(80,120,200,0.05)]">
            <div className="flex items-start justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className={cn('size-5', s.tint)} />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 生成记录列表 */}
        <Panel className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h3 className="text-base font-semibold text-foreground">生成记录</h3>
              <span className="text-xs text-muted-foreground">（共 {total} 条）</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
                {TABS.map((t) => (
                  <button key={t} type="button" onClick={() => { setTab(t); setPage(1) }}
                    className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                    {t}
                  </button>
                ))}
              </div>
              <button type="button" onClick={fetchRecords}
                className="flex items-center gap-1.5 text-sm text-primary hover:opacity-70">
                <RefreshCw className="size-3.5" />刷新
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {loading && records.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Loader2 className="inline-block size-5 animate-spin mr-2" />加载中...
              </div>
            ) : records.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">暂无该状态的生成记录</div>
            ) : (
              records.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border p-4 hover:border-primary/30 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{r.route_name}</span>
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">{r.route_type}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" />{r.duration_minutes}分钟
                      </span>
                      {r.suitable_people && (
                        <span className="flex items-center gap-1">
                          <Users className="size-3.5" />{r.suitable_people}
                        </span>
                      )}
                    </div>
                  </div>

                  {r.route_spots.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {r.route_spots.map((sp, i) => (
                        <span key={`${r.id}-${sp.spot_id || i}`} className="flex items-center gap-1.5">
                          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                            {sp.name}
                            {sp.stay ? ` ${sp.stay}min` : ''}
                          </span>
                          {i < r.route_spots.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
                        </span>
                      ))}
                    </div>
                  )}

                  {r.route_description && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{r.route_description}</p>
                  )}

                  <div className="mt-2 text-xs text-muted-foreground">
                    {r.created_at ? new Date(r.created_at).toLocaleString('zh-CN') : ''}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">共 {total} 条</span>
            <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} />
          </div>
        </Panel>

        {/* 配置区 */}
        <div className="space-y-4">
          <Panel>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-primary" />
              <h3 className="text-base font-semibold text-foreground">生成规则</h3>
            </div>
            <div className="mt-3 space-y-3">
              {rules.map((rule) => (
                <div key={rule.key} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-foreground">{rule.label}</span>
                  <Toggle on={rule.enabled} onClick={() => toggleRule(rule.key)} />
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-sm font-medium text-foreground">可选时长档位</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {routeDurationOptions.map((d) => (
                  <span key={d} className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">{d}</span>
                ))}
              </div>
              <p className="mt-4 text-sm font-medium text-foreground">可选主题标签</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {routeThemeOptions.map((t) => (
                  <span key={t} className={cn('rounded-md px-2 py-1 text-xs font-medium', routeThemeTone[t])}>{t}</span>
                ))}
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <h3 className="text-base font-semibold text-foreground">景点调度池</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">控制哪些景点允许被 AI 纳入路线规划。</p>
            <div className="mt-3 space-y-2">
              {pool.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.category}</p>
                  </div>
                  <Toggle on={s.enabled} onClick={() => toggleSpot(s.id)} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
