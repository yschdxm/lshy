'use client'

import { useState } from 'react'
import { Sparkles, Loader2, MapPin, Clock, Footprints } from 'lucide-react'
import { useRouteRecommend } from '@/lib/data-adapter'

const QUICK_PRESETS = [
  { label: '3h 亲子精华', hours: 3, interests: ['亲子', '祈福'], companions: '家庭', energy: '轻松' },
  { label: '2h 祈福朝圣', hours: 2, interests: ['祈福', '佛教文化'], companions: '朋友', energy: '适中' },
  { label: '4h 深度文化', hours: 4, interests: ['佛教文化', '历史古迹'], companions: '朋友', energy: '充沛' },
  { label: '半日摄影打卡', hours: 4, interests: ['拍照打卡', '自然风光'], companions: '朋友', energy: '适中' },
]

export function RouteInlineLive() {
  const { result, loading, recommend } = useRouteRecommend()

  return (
    <div className="rounded-3xl border border-white/60 bg-card/45 p-5 shadow-[0_8px_24px_rgb(80,120,200,0.10)] backdrop-blur-md">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="size-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">AI 智能路线推荐</span>
        <span className="text-xs text-muted-foreground">— 基于真实景区数据实时规划</span>
      </div>

      {/* 快捷预设 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            disabled={loading}
            onClick={() => recommend({ duration_hours: p.hours, interests: p.interests, companions: p.companions, energy_level: p.energy })}
            className="rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
          >
            {loading ? <Loader2 className="mr-1 inline size-3 animate-spin" /> : null}
            {p.label}
          </button>
        ))}
      </div>

      {/* 结果展示 */}
      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-sm font-semibold text-emerald-800">
            <Sparkles className="mr-1 inline size-3.5" />
            {result.route_name}
          </p>

          {/* 路线点 */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {result.spots?.map((s: any, i: number) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-xs text-muted-foreground">→</span>}
                <span className="rounded-md bg-white/80 px-2 py-0.5 text-xs font-medium text-foreground">
                  {s.spot_name}
                </span>
              </span>
            ))}
          </div>

          {/* 统计 */}
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="size-3" />{result.total_minutes}分钟</span>
            <span className="flex items-center gap-1"><Footprints className="size-3" />{result.walking_distance}m</span>
            <span className="flex items-center gap-1"><MapPin className="size-3" />{result.spots?.length || 0}个景点</span>
          </div>

          {result.tips?.length && (
            <div className="mt-2">
              {result.tips.slice(0, 3).map((t: string, i: number) => (
                <p key={i} className="text-xs text-emerald-700">💡 {t}</p>
              ))}
            </div>
          )}

          {result.show_reminders?.length && (
            <div className="mt-2">
              {result.show_reminders.map((r: string, i: number) => (
                <p key={i} className="text-xs text-amber-700">⏰ {r}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
