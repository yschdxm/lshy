'use client'

import { useMemo, useRef, useState } from 'react'
import { CHINA_PROVINCES, CHINA_VIEWBOX } from '@/lib/china-geo'

export function ChinaMap({
  data,
}: {
  data: { name: string; value: number }[]
}) {
  const [hover, setHover] = useState<{ name: string; value: number; x: number; y: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const valueMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of data) m.set(d.name, d.value)
    return m
  }, [data])

  const max = useMemo(() => Math.max(1, ...data.map((d) => d.value)), [data])

  // resolve each province's value (data uses short names e.g. 江苏; geo uses 江苏省)
  const provinces = useMemo(() => {
    return CHINA_PROVINCES.map((p) => {
      let value = valueMap.get(p.name) ?? 0
      if (value === 0) {
        for (const [key, v] of valueMap) {
          if (p.name.startsWith(key)) {
            value = v
            break
          }
        }
      }
      return { ...p, value }
    })
  }, [valueMap])

  function fillFor(value: number) {
    if (value <= 0) return '#1c3e63'
    const t = Math.pow(value / max, 0.6)
    // deep blue -> bright cyan (rgb interpolation for reliable SVG rasterization)
    const from = [42, 110, 168]
    const to = [96, 232, 246]
    const r = Math.round(from[0] + (to[0] - from[0]) * t)
    const g = Math.round(from[1] + (to[1] - from[1]) * t)
    const b = Math.round(from[2] + (to[2] - from[2]) * t)
    return `rgb(${r}, ${g}, ${b})`
  }

  function setHoverAt(name: string, value: number, e: React.MouseEvent) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    setHover({ name, value, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={CHINA_VIEWBOX}
        className="mx-auto block w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="游客地域分布地图"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <filter id="mapGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="rgb(90, 200, 240)" floodOpacity="0.55" />
          </filter>
        </defs>
        {provinces.map((p) => (
          <path
            key={p.name}
            d={p.d}
            fill={fillFor(p.value)}
            stroke="rgba(130, 225, 255, 0.85)"
            strokeWidth={1.2}
            style={{ transition: 'fill 0.2s', cursor: p.value > 0 ? 'pointer' : 'default' }}
            filter={p.value > 0 ? 'url(#mapGlow)' : undefined}
            onMouseMove={(e) => setHoverAt(p.name, p.value, e)}
            onMouseEnter={(e) => setHoverAt(p.name, p.value, e)}
          />
        ))}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-white/15 bg-[oklch(0.2_0.04_250)] px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: hover.x, top: hover.y - 8 }}
        >
          <p className="font-medium text-[oklch(0.95_0.02_240)]">{hover.name}</p>
          <p className="font-mono tabular-nums text-[oklch(0.82_0.12_205)]">
            {hover.value > 0 ? `${hover.value.toLocaleString()} 人` : '暂无数据'}
          </p>
        </div>
      )}
    </div>
  )
}
