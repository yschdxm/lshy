'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, Flame, Megaphone, Cloud, CloudRain, Thermometer } from 'lucide-react'
import { cn } from '@/lib/utils'

const HIGHLIGHT_SPOTS = [
  { name: '灵山大照壁', image: '/LS-001.jpg', desc: '景区入口第一景，赵朴初先生亲笔题字' },
  { name: '灵山大佛',   image: '/LS-011.jpg', desc: '88米青铜立像，世界最高露天释迦牟尼佛' },
  { name: '灵山梵宫',   image: '/LS-013.jpg', desc: '7.2万㎡东方卢浮宫，佛教艺术殿堂' },
]

// 动态公告生成
function getAnnouncements() {
  const now = new Date()
  const hour = now.getHours()
  const announcements = [
    {
      title: hour < 12 ? '今日开放中（07:30-17:30）' : '景区即将结束运营',
      detail: hour < 12 ? '建议上午入园，光线最佳' : hour < 16 ? '下午光线柔和，适合拍照' : '请留意离园时间',
      color: 'text-emerald-500',
    },
    {
      title: '九龙灌浴演出场次',
      detail: '10:00 / 11:30 / 13:30 / 15:00',
      color: 'text-blue-500',
    },
    {
      title: '梵宫素斋今日开放',
      detail: '午餐 11:00-13:30 · 35元/位',
      color: 'text-amber-500',
    },
  ]
  return announcements
}

export function RightPanelLive() {
  const [weather, setWeather] = useState<{ temp?: string; desc?: string }>({})
  const [announcements, setAnnouncements] = useState(getAnnouncements())

  // 天气：走高德 API（快速）
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/service/weather?city=320200`)
      .then(r => r.json())
      .then(d => {
        if (d.temperature) setWeather({ temp: d.temperature, desc: d.weather || '多云' })
      })
      .catch(() => {})
    // 公告每小时刷新
    const timer = setInterval(() => setAnnouncements(getAnnouncements()), 600000)
    return () => clearInterval(timer)
  }, [])

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-72">
      {/* 实时天气 — 固定高度防跳变 */}
      <section className="rounded-xl bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.16)]" style={{ minHeight: 96 }}>
        <div className="mb-3 flex items-center gap-2">
          {weather.desc?.includes('雨') ? <CloudRain className="size-5 text-sky-500" /> : <Cloud className="size-5 text-sky-500" />}
          <h3 className="font-bold text-foreground">实时天气</h3>
        </div>
        {weather.temp ? (
          <div className="flex items-center gap-3">
            <Thermometer className="size-8 text-orange-500" />
            <div><p className="text-2xl font-bold">{weather.temp}°C</p><p className="text-xs text-muted-foreground">{weather.desc} · 无锡灵山</p></div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Thermometer className="size-8 text-orange-500/30" />
            <div><p className="text-2xl font-bold text-muted-foreground">--°C</p><p className="text-xs text-muted-foreground">获取中...</p></div>
          </div>
        )}
      </section>

      {/* 热门景点 — 真实配图 */}
      <section className="rounded-xl bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.16)]">
        <div className="mb-3 flex items-center gap-2">
          <Flame className="size-5 text-orange-500" />
          <h3 className="font-bold text-foreground">精选景点</h3>
        </div>
        <ul className="flex flex-col gap-3">
          {HIGHLIGHT_SPOTS.map((s) => (
            <li key={s.name}>
              {/* 必须用 Link：普通 <a> 会整页刷新，导致全局数字人连接被销毁重建 */}
              <Link href={`/guide?spot=${encodeURIComponent(s.name)}`} className="group flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-secondary">
                <img src={s.image} alt={s.name} className="size-12 shrink-0 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.desc}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 公告 — 动态 */}
      <section className="rounded-xl bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.16)]">
        <div className="mb-3 flex items-center gap-2">
          <Megaphone className="size-5 text-primary" />
          <h3 className="font-bold text-foreground">景区公告</h3>
        </div>
        <ul className="flex flex-col gap-4">
          {announcements.map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              <span className={cn('mt-1.5 size-2 shrink-0 rounded-full bg-current', item.color)} />
              <div>
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
