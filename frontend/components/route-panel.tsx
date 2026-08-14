'use client'

import { useState } from 'react'
import { ChevronRight, HelpCircle, X, Clock, Footprints, MapPin } from 'lucide-react'
import { routeAlternatives } from '@/lib/mock-data'

interface Props {
  routeData?: any
  prefs?: Record<string, string>
  onQuestionClick?: (q: string, routeContext?: string) => void
  onPresetClick?: (prefs: Record<string, string>) => void
}

const ALT_PRESETS: Record<string, { prefs: Record<string, string>; itinerary: string[] }> = {
  family: { prefs: { time: 'half', interest: 'family', company: 'family', stamina: 'easy' }, itinerary: ['灵山大照壁', '菩提大道', '百子戏弥勒', '九龙灌浴', '灵山大佛'] },
  worship: { prefs: { time: 'full', interest: 'culture', company: 'solo', stamina: 'normal' }, itinerary: ['胜境门楼', '佛足坛', '五智门', '祥符禅寺', '灵山大佛', '灵山梵宫', '五印坛城', '曼荼罗塔'] },
  essence: { prefs: { time: 'half', interest: 'photo', company: 'couple', stamina: 'normal' }, itinerary: ['灵山大照壁', '九龙灌浴', '灵山大佛', '灵山梵宫', '五印坛城'] },
  night: { prefs: { time: '2h', interest: 'culture', company: 'couple', stamina: 'easy' }, itinerary: ['灵山大佛', '灵山梵宫', '五印坛城'] },
}

const QUICK_PRESETS: { label: string; prefs: Record<string, string> }[] = [
  { label: '3h 亲子精华', prefs: { time: '2h', interest: 'family', company: 'family', stamina: 'easy' } },
  { label: '2h 祈福朝圣', prefs: { time: '2h', interest: 'culture', company: 'solo', stamina: 'normal' } },
  { label: '4h 深度文化', prefs: { time: 'half', interest: 'culture', company: 'couple', stamina: 'deep' } },
  { label: '半日摄影打卡', prefs: { time: 'half', interest: 'photo', company: 'couple', stamina: 'normal' } },
]

export function RoutePanel({ routeData, prefs, onQuestionClick, onPresetClick }: Props) {
  const [themeModal, setThemeModal] = useState<string | null>(null)
  const activeTheme = themeModal ? ALT_PRESETS[themeModal] : null

  const routeContext = routeData ? JSON.stringify({
    name: routeData.route_name,
    spots: (routeData.spots || []).map((s: any) => s.spot_name),
    duration: routeData.total_minutes,
    distance: routeData.walking_distance,
  }) : undefined

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-56">
      {/* 快捷预设 */}
      <section className="rounded-xl bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.16)]">
        <h3 className="text-base font-bold text-foreground">快捷预设</h3>
        <p className="text-xs text-muted-foreground mt-1">点击自动填充偏好</p>
        <div className="mt-3 flex flex-col gap-2">
          {QUICK_PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => onPresetClick?.(p.prefs)}
              className="group flex items-center justify-between gap-2 rounded-lg border border-border bg-card/60 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-secondary">
              <span>{p.label}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
            </button>
          ))}
        </div>
      </section>

      {/* 主题路线 — 点击预览行程 */}
      <section className="rounded-xl bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.16)]">
        <h3 className="text-base font-bold text-foreground">主题路线</h3>
        <p className="text-xs text-muted-foreground mt-1">点击查看详细行程</p>
        <div className="mt-3 flex flex-col gap-2">
          {routeAlternatives.map((r) => (
            <button key={r.key} type="button" onClick={() => setThemeModal(r.key)}
              className="group flex items-center gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-secondary w-full">
              <img src={r.image || '/placeholder.svg'} alt={r.name} className="size-10 shrink-0 rounded-md object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                <p className="truncate text-xs text-muted-foreground">{r.subtitle}</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
            </button>
          ))}
        </div>
      </section>

      {/* 主题路线预览弹窗 */}
      {themeModal && activeTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setThemeModal(null)} role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="text-lg font-bold text-foreground">{routeAlternatives.find(r => r.key === themeModal)?.name}</h3>
              <button onClick={() => setThemeModal(null)} className="flex size-8 items-center justify-center rounded-full hover:bg-secondary">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">行程预览</p>
                <div className="flex flex-col gap-1.5">
                  {activeTheme.itinerary.map((name, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                      <span className="text-foreground">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="size-3" />{activeTheme.itinerary.length} 个景点</span>
              </div>
              <button onClick={() => { onPresetClick?.(activeTheme.prefs); setThemeModal(null) }}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                使用此路线生成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 路线摘要 */}
      <section className="rounded-xl bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.16)]">
        <h3 className="text-base font-bold text-foreground">路线摘要</h3>
        <dl className="mt-3 flex flex-col gap-2.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">景点数：</dt><dd className="font-medium text-foreground">{routeData?.spots?.length || '—'}个</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">总时长：</dt><dd className="font-medium text-foreground">{routeData?.total_minutes ? `${routeData.total_minutes}分钟` : '—'}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">步行：</dt><dd className="font-medium text-foreground">{routeData?.walking_distance ? `${routeData.walking_distance}m` : '—'}</dd>
          </div>
          {routeData?.spots?.length && (
            <div className="border-t border-border pt-2">
              <dt className="text-muted-foreground text-xs">路线节点：</dt>
              <dd className="mt-1 text-xs text-foreground leading-relaxed">{routeData.spots.map((s: any) => s.spot_name).join(' → ')}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* 猜你想问 */}
      <section className="rounded-xl bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.16)]">
        <div className="flex items-center gap-2">
          <HelpCircle className="size-5 text-primary" /><h3 className="text-base font-bold text-foreground">猜你想问</h3>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {['这条路线步行累不累？', '中途有地方休息吃饭吗？', '帮我优化一下这条路线'].map((q) => (
            <button key={q} type="button" onClick={() => onQuestionClick?.(q, routeContext)}
              className="group flex items-center justify-between gap-2 rounded-lg border border-border bg-card/60 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-secondary">
              <span className="min-w-0 flex-1">{q}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
            </button>
          ))}
        </div>
      </section>
    </aside>
  )
}
