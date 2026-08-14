'use client'

import { ChevronRight, Flame } from 'lucide-react'
import { hotServices } from '@/lib/mock-data'

interface Props {
  selectedFacility?: { name: string; distance: string; address: string; tel: string } | null
  activeType?: string
  onHotServiceClick?: (type: string) => void
  onQuestionClick?: (q: string) => void
}

export function ServicePanel({ selectedFacility, activeType, onHotServiceClick, onQuestionClick }: Props) {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-56">
      {/* 热门服务 */}
      <section className="rounded-xl bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.16)]">
        <div className="flex items-center gap-2">
          <Flame className="size-5 text-orange-500" />
          <h3 className="text-base font-bold text-foreground">热门服务</h3>
        </div>
        <div className="mt-3 flex flex-col gap-1">
          {hotServices.map((s) => (
            <button key={s.key} type="button" onClick={() => onHotServiceClick?.(s.key)}
              className="group flex items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-secondary">
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${s.iconBg}`}>
                <s.icon className={`size-4 ${s.iconColor}`} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{s.label}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
            </button>
          ))}
        </div>
      </section>

      {/* 服务摘要 — 动态 */}
      <section className="rounded-xl bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.16)]">
        <h3 className="text-base font-bold text-foreground">服务摘要</h3>
        <dl className="mt-3 flex flex-col gap-2.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">当前服务：</dt>
            <dd className="font-medium text-foreground">{selectedFacility?.name || '—'}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">距离：</dt>
            <dd className="font-medium text-foreground">{selectedFacility?.distance ? `${selectedFacility.distance}m` : '—'}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">位置：</dt>
            <dd className="font-medium text-foreground truncate max-w-[120px]">{selectedFacility?.address || '—'}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2">
            <dt className="text-muted-foreground">状态：</dt>
            <dd className="font-medium text-emerald-600">{selectedFacility ? '开放中' : '—'}</dd>
          </div>
          {selectedFacility?.tel && (
            <div>
              <dt className="text-muted-foreground">电话：</dt>
              <dd className="mt-1 font-medium text-foreground">{selectedFacility.tel}</dd>
            </div>
          )}
        </dl>
      </section>

    </aside>
  )
}
