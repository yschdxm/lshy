'use client'

import { Sparkles } from 'lucide-react'
import { useHotSpots } from '@/lib/data-adapter'

/** 首页热门推荐 — 实时景点数据 */
export function HomeHotSpots() {
  const { spots } = useHotSpots(3)

  if (!spots.length) return null

  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm font-semibold text-foreground">
        <Sparkles className="mr-1 inline size-3.5 text-primary" />
        热门景点
      </p>
      {spots.slice(0, 3).map((s) => (
        <div key={s.spot_id} className="flex items-center gap-2 rounded-lg border border-border bg-white/60 px-3 py-2 text-sm">
          <span className="size-2 shrink-0 rounded-full bg-primary" />
          <span className="font-medium text-foreground">{s.spot_name}</span>
          <span className="ml-auto text-xs text-muted-foreground">{s.recommended_duration}分钟</span>
        </div>
      ))}
    </div>
  )
}
