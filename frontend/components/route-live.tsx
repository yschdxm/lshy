'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { useRouteRecommend } from '@/lib/data-adapter'
import { routeStops as mockStops, routeStats as mockStats, routeReason as mockReason } from '@/lib/mock-data'

/** 在原有 RouteCenter 下方添加实时 API 规划按钮 */
export function RouteLiveActions({
  prefs,
  onResult,
}: {
  prefs: { duration_hours: number; interests: string[]; companions: string; energy_level: string }
  onResult?: (data: any) => void
}) {
  const { result, loading, recommend } = useRouteRecommend()
  const [used, setUsed] = useState(false)

  async function handlePlan() {
    const r = await recommend(prefs)
    if (r) setUsed(true)
    onResult?.(r)
  }

  if (!used) {
    return (
      <button
        type="button"
        onClick={handlePlan}
        disabled={loading}
        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_6px_16px_rgb(80,120,200,0.28)] transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        <span>{loading ? 'AI 规划中...' : 'AI 智能规划'}</span>
      </button>
    )
  }

  if (!result) return null

  return (
    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
      <p className="text-sm font-medium text-emerald-700">
        <Sparkles className="mr-1 inline size-3.5" />
        AI 推荐路线：{result.route_name}
      </p>
      <p className="mt-1 text-xs text-emerald-600">
        {result.spots?.map((s: any) => s.spot_name).join(' → ')}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        全程 {result.total_minutes} 分钟 · 步行 {result.walking_distance}m
      </p>
      {result.reason && (
        <p className="mt-1 text-xs text-muted-foreground">{result.reason}</p>
      )}
    </div>
  )
}
