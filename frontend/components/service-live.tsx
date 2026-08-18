'use client'

import { useState, useEffect } from 'react'
import { MapPin, Footprints, CornerUpRight, AlertCircle, Navigation } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AmapRoute } from '@/components/amap-route'

const CATEGORIES = [
  { key: 'toilet', label: '洗手间', icon: '🚻' },
  { key: 'dining', label: '餐饮', icon: '🍽️' },
  { key: 'exit', label: '出口', icon: '🚪' },
  { key: 'medical', label: '医疗点', icon: '🏥' },
  { key: 'center', label: '游客中心', icon: '🏛️' },
  { key: 'lost', label: '失物招领', icon: '📦' },
  { key: 'accessible', label: '无障碍', icon: '♿' },
  { key: 'parking', label: '停车场', icon: '🅿️' },
]

interface Facility { name: string; type: string; location: string; address: string; distance: string; tel: string }

async function fetchNearby(type: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/service/nearby`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ facility_type: type, radius: 1000 }),
  })
  return res.json()
}

async function fetchWalking(origin: string, dest: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/service/walking`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination: dest }),
  })
  return res.json()
}

interface Props { onFacilityChange?: (f: Facility | null, type: string) => void; externalType?: string }

export function ServiceLive({ onFacilityChange, externalType }: Props) {
  const [activeType, setActiveType] = useState('toilet')
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [walking, setWalking] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const selected = facilities[selectedIdx] || null  // 用索引确保唯一性

  useEffect(() => { if (externalType) setActiveType(externalType) }, [externalType])

  useEffect(() => {
    setLoading(true); setError(''); setSelectedIdx(0); setWalking(null)
    fetchNearby(activeType).then(data => {
      setFacilities(data.facilities || [])
      if (data.facilities?.length) { setSelectedIdx(0); onFacilityChange?.(data.facilities[0], activeType) }
    }).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [activeType])

  useEffect(() => {
    if (selected?.location) fetchWalking('120.100925,31.425920', selected.location).then(setWalking)
    onFacilityChange?.(selected, activeType)
  }, [selected])

  // 地图标点：当前位置 + 服务点
  const mapSpots: { name: string; spot_id: string }[] = []
  if (selected?.location) {
    mapSpots.push({ name: '📍 当前位置', spot_id: 'origin' })
    mapSpots.push({ name: selected.name, spot_id: selected.location })
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <div>
        <h2 className="inline-block border-b-2 border-primary pb-1 text-2xl font-bold text-foreground">便民服务</h2>
        <p className="mt-2 text-sm text-muted-foreground">快速查找景区设施，获得路线指引与实用信息</p>
      </div>

      {/* 分类按钮 — 顶部横向 */}
      <div className="mt-4 rounded-2xl border border-white/60 bg-white/60 p-3">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <button key={c.key} type="button" onClick={() => setActiveType(c.key)}
              className={cn('flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                activeType === c.key ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-white text-muted-foreground hover:bg-secondary')}>
              <span>{c.icon}</span> {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* 主布局：左地图 + 右设施列表 */}
      <div className="mt-4 flex flex-col gap-4 lg:flex-row">
        {/* 左侧：大尺寸地图 */}
        <div className="flex-1 min-w-0 lg:w-[60%]">
          {selected ? (
            <div className="rounded-2xl border border-white/60 bg-white p-3 shadow-[0_6px_16px_rgb(80,120,200,0.10)]">
              <h3 className="mb-2 text-sm font-semibold text-foreground">{selected.name}</h3>
              <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl">
                <AmapRoute spots={mapSpots} className="h-full w-full" />
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {walking?.distance && <span className="flex items-center gap-1"><Footprints className="size-3.5 text-primary" />步行 {walking.duration} 分钟</span>}
                <span className="flex items-center gap-1"><MapPin className="size-3.5 text-primary" />{selected.distance}m</span>
                <span className="flex items-center gap-1"><CornerUpRight className="size-3.5 text-primary" />{selected.address}</span>
              </div>
              {walking?.steps?.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {walking.steps.slice(0, 2).map((s: any, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground flex items-center gap-1"><Navigation className="size-3 shrink-0 text-primary" />{s.instruction.replace(/<[^>]+>/g, '')}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex aspect-[3/2] items-center justify-center rounded-2xl border border-white/60 bg-white">
              <p className="text-sm text-muted-foreground">选择服务类型查看地图导航</p>
            </div>
          )}
        </div>

        {/* 右侧：设施列表（可滚动） */}
        <div className="flex flex-col gap-2 lg:w-[40%] max-h-[480px] overflow-y-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground px-1">搜索中...</p>
          ) : error ? (
            <p className="text-sm text-red-500 px-1"><AlertCircle className="inline size-4 mr-1" />{error}</p>
          ) : (
            facilities.map((f, i) => (
              <button key={i} type="button" onClick={() => setSelectedIdx(i)}
                className={cn('flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors',
                  selectedIdx === i ? 'border-primary bg-primary/5 shadow-sm' : 'border-transparent bg-transparent hover:bg-secondary/50')}>
                <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full text-base',
                  selectedIdx === i ? 'bg-emerald-100' : 'bg-secondary/60')}>
                  {CATEGORIES.find(c => c.key === activeType)?.icon || '📍'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{f.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-primary font-medium">{f.distance}m</span>
                    {f.tel && <span className="text-[10px] text-muted-foreground truncate">{f.tel}</span>}
                  </div>
                </div>
                {selectedIdx === i && <span className="shrink-0 text-primary text-xs">✓</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
