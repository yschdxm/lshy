'use client'

import { ChevronRight, Flame, Megaphone } from 'lucide-react'
import { recommendations, announcements } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

export function RightPanel() {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-72">
      {/* Hot recommendations */}
      <section className="rounded-xl bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.16)]">
        <div className="mb-4 flex items-center gap-2">
          <Flame className="size-5 text-orange-500" />
          <h3 className="font-bold text-foreground">热门推荐</h3>
        </div>
        <ul className="flex flex-col gap-3">
          {recommendations.map((item) => (
            <li key={item.title}>
              <button
                type="button"
                className="group flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-secondary"
              >
                <img
                  src={item.image || '/placeholder.svg'}
                  alt={item.title}
                  className="size-12 shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.subtitle}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Announcements */}
      <section className="rounded-xl bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.16)]">
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="size-5 text-primary" />
          <h3 className="font-bold text-foreground">今日公告</h3>
        </div>
        <ul className="flex flex-col gap-4">
          {announcements.map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-1.5 size-2 shrink-0 rounded-full bg-current',
                  item.color,
                )}
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
