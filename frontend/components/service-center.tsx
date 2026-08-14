'use client'

import { useState } from 'react'
import { Send, MapPin, Footprints, CornerUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  serviceCategories,
  serviceDetail,
  serviceTips,
  serviceActions,
} from '@/lib/mock-data'

export function ServiceCenter() {
  const [activeCategory, setActiveCategory] = useState('toilet')

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      {/* Title */}
      <div>
        <h2 className="inline-block border-b-2 border-primary pb-1 text-2xl font-bold text-foreground">
          便民服务
        </h2>
      </div>

      {/* Hero banner */}
      <div className="relative mt-4 overflow-hidden rounded-xl shadow-[0_6px_18px_rgb(80,120,200,0.18)]">
        <img
          src="/service-banner.png"
          alt="灵山胜境风光"
          className="h-28 w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.9_0.06_255)] via-[oklch(0.92_0.05_255)]/70 to-transparent" />
        <div className="absolute inset-y-0 left-0 flex flex-col justify-center p-5">
          <h3 className="text-lg font-bold text-slate-800 text-balance">
            贴心服务就在身边
          </h3>
          <p className="mt-1 max-w-md text-xs text-slate-600 text-pretty">
            快速查找景区设施，获得路线指引与实用信息
          </p>
        </div>
      </div>

      {/* Service categories */}
      <div className="mt-4 rounded-2xl border border-white/60 bg-white/60 p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">服务分类</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {serviceCategories.map((c) => {
            const isActive = c.key === activeCategory
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setActiveCategory(c.key)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-white text-muted-foreground hover:bg-secondary',
                )}
              >
                <c.icon className="size-4 shrink-0" />
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Nearest facility detail */}
      <div className="mt-4 rounded-2xl border border-white/60 bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.10)]">
        <h3 className="text-base font-bold text-foreground">
          最近卫生间：{serviceDetail.title}
        </h3>

        <div className="mt-3 flex flex-col gap-4 lg:flex-row">
          {/* Illustrated navigation map */}
          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg lg:w-80">
            <img
              src="/service-map.png"
              alt="灵山胜境导航地图"
              className="h-full w-full object-cover"
            />
            {/* Dashed navigation path */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <polyline
                points="20,86 34,70 46,74 58,58 70,44"
                fill="none"
                stroke="oklch(0.6 0.17 155)"
                strokeWidth="1"
                strokeDasharray="3 2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {/* Current location pin */}
            <div
              className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
              style={{ left: '20%', top: '86%' }}
            >
              <span className="whitespace-nowrap rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-primary shadow-md">
                您当前在此
              </span>
              <MapPin className="size-6 fill-primary text-primary drop-shadow" />
            </div>
            {/* Destination pin */}
            <div
              className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
              style={{ left: '70%', top: '44%' }}
            >
              <span className="whitespace-pre-line rounded-lg bg-white px-2.5 py-1 text-center text-[11px] font-semibold text-foreground shadow-md">
                {serviceDetail.destName}
              </span>
              <MapPin className="size-6 fill-emerald-500 text-emerald-500 drop-shadow" />
            </div>
          </div>

          {/* Navigation info */}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Footprints className="size-4 shrink-0 text-primary" />
                <span className="text-foreground">{serviceDetail.walkTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="size-4 shrink-0 text-primary" />
                <span className="text-foreground">{serviceDetail.distance}</span>
              </div>
              <div className="flex items-start gap-2">
                <CornerUpRight className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">
                  {serviceDetail.guide}
                </span>
              </div>
            </div>

            {/* Status tags */}
            <div className="flex flex-wrap gap-2">
              {serviceDetail.tags.map((t) => (
                <span
                  key={t.key}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium',
                    t.tone === 'open'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                      : 'border-border bg-secondary/50 text-foreground',
                  )}
                >
                  <t.icon className="size-3.5" />
                  {t.label}
                </span>
              ))}
              <span className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground">
                {serviceDetail.hours}
              </span>
            </div>

            <div className="mt-auto flex justify-end">
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_6px_16px_rgb(80,120,200,0.28)] transition-colors hover:bg-primary/90"
              >
                <Send className="size-4" />
                开始导航
              </button>
            </div>
          </div>
        </div>

        {/* Service tips */}
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-sm font-semibold text-foreground">服务提醒</p>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {serviceTips.map((t) => (
              <div
                key={t.key}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <t.icon className="size-4 shrink-0 text-primary" />
                {t.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {serviceActions.map((a) => (
          <button
            key={a.key}
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <a.icon className="size-4 shrink-0 text-primary" />
            {a.label}
          </button>
        ))}
      </div>
    </section>
  )
}
