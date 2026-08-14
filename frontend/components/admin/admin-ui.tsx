'use client'

import type { ReactNode } from 'react'
import { ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ---------- Page header ---------- */
export function PageHeader({
  title,
  desc,
  actions,
}: {
  title: string
  desc?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {desc && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ---------- Stat card ---------- */
export function StatCard({
  label,
  value,
  trend,
  icon: Icon,
  tint,
}: {
  label: string
  value: string
  trend?: { value: string; up: boolean }
  icon: LucideIcon
  tint: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_4px_14px_rgb(80,120,200,0.05)]">
      <div className="flex items-start justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn('flex size-9 items-center justify-center rounded-xl', tint)}>
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      {trend && (
        <p className="mt-1 flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">较昨日</span>
          <span
            className={cn(
              'flex items-center gap-0.5 font-medium',
              trend.up ? 'text-emerald-600' : 'text-rose-500',
            )}
          >
            {trend.up ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {trend.value}
          </span>
        </p>
      )}
    </div>
  )
}

/* ---------- Card container ---------- */
export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-5 shadow-[0_4px_14px_rgb(80,120,200,0.05)]',
        className,
      )}
    >
      {title && (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

/* ---------- Donut chart (SVG) ---------- */
export function DonutChart({
  data,
  total,
  totalLabel = '总计',
  size = 160,
}: {
  data: { name: string; count: number; color: string }[]
  total: number
  totalLabel?: string
  size?: number
}) {
  const sum = data.reduce((a, b) => a + b.count, 0)
  const r = 40
  const c = 2 * Math.PI * r
  let offset = 0

  return (
    <svg
      viewBox="0 0 100 100"
      style={{ width: size, height: size }}
      className="-rotate-90"
      role="img"
      aria-label="文档分类分布环形图"
    >
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--secondary)" strokeWidth="12" />
      {data.map((d) => {
        const frac = d.count / sum
        const len = frac * c
        const seg = (
          <circle
            key={d.name}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={d.color}
            strokeWidth="12"
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
          />
        )
        offset += len
        return seg
      })}
      {/* center text (counter-rotate) */}
      <g transform="rotate(90 50 50)">
        <text
          x="50"
          y="47"
          textAnchor="middle"
          className="fill-foreground"
          style={{ fontSize: 15, fontWeight: 700 }}
        >
          {total}
        </text>
        <text
          x="50"
          y="60"
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 7 }}
        >
          {totalLabel}
        </text>
      </g>
    </svg>
  )
}

/* ---------- Pagination ---------- */
export function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
}: {
  total: number
  page: number
  pageSize: number
  onPageChange: (p: number) => void
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const pages: (number | '...')[] = []
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || (i >= page - 1 && i <= page + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40"
      >
        <ChevronLeft className="size-4" />
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="px-2 text-sm text-muted-foreground">
            ...
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={cn(
              'flex size-8 items-center justify-center rounded-lg border text-sm transition-colors',
              p === page
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-foreground hover:bg-secondary',
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page === pageCount}
        onClick={() => onPageChange(page + 1)}
        className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}
