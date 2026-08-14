'use client'

import { useState, useEffect } from 'react'
import { Send, Leaf, Volume2, ChevronDown, Maximize2, X, Loader2, Sparkles, MapPin, Clock, Footprints, Users, Signpost, SlidersHorizontal, Navigation, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { speak as ttsSpeak, stop as ttsStop, isSpeaking as ttsIsSpeaking, onTTSStateChange } from '@/lib/tts-controller'
import { routePrefs, routeReason as mockReason } from '@/lib/mock-data'
import { AmapRoute } from '@/components/amap-route'
import { getNearbySpots } from '@/lib/api'
import type { NearbySpot } from '@/lib/api'

interface Props {
  onRouteResult?: (result: any, prefs: Record<string, string>) => void
  onQuestionClick?: (q: string) => void
  onPresetRef?: (fn: (p: Record<string, string>) => void) => void
}

const TIME_MAP: Record<string, string> = { '1h': '1小时', '2h': '2小时', half: '半日', full: '1日' }
const INTEREST_MAP: Record<string, string[]> = {
  culture: ['佛教文化', '历史古迹'], nature: ['自然风光', '拍照打卡'],
  family: ['亲子', '祈福'], photo: ['拍照打卡', '自然风光'],
}
const COMPANION_MAP: Record<string, string> = { solo: '独行', couple: '情侣', family: '家庭', elder: '老人' }
const STAMINA_MAP: Record<string, string> = { easy: '轻松', normal: '普通', deep: '充足' }
const ENTRANCE_MAP: Record<string, string> = { main: '胜境门楼', east: '东门', west: '西门', north: '北门' }

export function RouteCenter({ onRouteResult, onQuestionClick, onPresetRef }: Props) {
  const [prefs, setPrefs] = useState<Record<string, string>>(() =>
    Object.fromEntries(routePrefs.map((r) => [r.key, r.activeKey])),
  )
  const [genPrefs, setGenPrefs] = useState<Record<string, string>>({})
  const [mapZoomed, setMapZoomed] = useState(false)
  const [nearbySpots, setNearbySpots] = useState<NearbySpot[]>([])
  const [showReminders, setShowReminders] = useState<string[]>([])
  const [nearbyMode, setNearbyMode] = useState(false)   // 附近景点模式
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyError, setNearbyError] = useState('')
  const [relocateSpot, setRelocateSpot] = useState('')    // 重定位参考景点
  const [gpsLoading, setGpsLoading] = useState(false)

  /** 浏览器精准GPS定位 */
  async function locateByGPS() {
    setGpsLoading(true); setNearbyError('')
    try {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setNearbyError('浏览器不支持GPS定位'); return
      }
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, enableHighAccuracy: true })
      })
      const r = await getNearbySpots(undefined, pos.coords.latitude, pos.coords.longitude) as any
      setNearbySpots(r.nearby || [])
      setRelocateSpot('')
    } catch (e: any) {
      if (e.code === 1) setNearbyError('GPS权限被拒绝，请允许定位后重试')
      else if (e.code === 2) setNearbyError('GPS信号不可用，请移动到开阔地带')
      else if (e.code === 3) setNearbyError('GPS定位超时，请重试')
      else setNearbyError('定位失败，请重试')
    } finally { setGpsLoading(false) }
  }

  // 灵山景区预设定位（灵山大佛与梵宫之间，核心景区中心）
  const DEFAULT_LAT = 31.4278
  const DEFAULT_LNG = 120.101
  // 可选重定位参考景点
  const RELOCATE_SPOTS = [
    { spot_id: 'LS-001', name: '灵山大照壁（入口）', lat: 31.427, lng: 120.095 },
    { spot_id: 'LS-006', name: '九龙灌浴', lat: 31.429, lng: 120.097 },
    { spot_id: 'LS-011', name: '灵山大佛', lat: 31.428, lng: 120.101 },
    { spot_id: 'LS-013', name: '灵山梵宫', lat: 31.426, lng: 120.102 },
    { spot_id: 'NH-001', name: '拈花湾', lat: 31.420, lng: 120.106 },
  ]

  // 演出数据
  const SHOW_SPOTS: Record<string, {name: string; times: string}> = {
    'LS-006': { name: '九龙灌浴', times: '10:00 / 11:30 / 13:30 / 15:00' },
    'LS-012': { name: '灵山吉祥颂', times: '10:35 / 11:30 / 14:00 / 16:00' },
  }
  const [loading, setLoading] = useState(false)
  const [routeData, setRouteData] = useState<any>(null)
  const [error, setError] = useState('')
  const [wantShows, setWantShows] = useState(true)
  const [mustSpots, setMustSpots] = useState<string[]>([])
  const [routeSpeaking, setRouteSpeaking] = useState(false)
  const [prefsExpanded, setPrefsExpanded] = useState(true)  // 偏好设置展开状态

  useEffect(() => {
    return onTTSStateChange((state) => setRouteSpeaking(state === 'speaking'))
  }, [])

  const TOP_SPOTS = ['灵山大佛', '九龙灌浴', '灵山梵宫', '五印坛城', '祥符禅寺', '阿育王柱', '降魔浮雕', '百子戏弥勒', '菩提大道', '无尽意斋']

  useEffect(() => {
    onPresetRef?.((p: Record<string, string>) => { setPrefs(p); setPrefsExpanded(true) })
  }, [])

  async function generateRoute() {
    setLoading(true); setError('')
    const snapshot = { ...prefs }
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/routes/recommend`, {
        method: 'POST', headers,
        body: JSON.stringify({
          duration: TIME_MAP[snapshot.time] || '半日',
          interests: INTEREST_MAP[snapshot.interest] || ['佛教文化'],
          companions: COMPANION_MAP[snapshot.company] || '朋友',
          energy: STAMINA_MAP[snapshot.stamina] || '普通',
          entrance: snapshot.entrance || 'main',
          want_shows: wantShows,
          must_spots: mustSpots,
        }),
      })
      const data = await res.json()
      setRouteData(data)
      setGenPrefs(snapshot)
      setPrefsExpanded(false)  // 生成后收起偏好设置
      setNearbyMode(false)     // 切回路线模式
      onRouteResult?.(data, snapshot)

      // 检查路线中的演出景点
      const reminders: string[] = []
      if (data.spots) {
        for (const s of data.spots) {
          const show = SHOW_SPOTS[s.spot_id]
          if (show) reminders.push(`${show.name} 演出时间 ${show.times}`)
        }
      }
      setShowReminders(reminders)

      // 默认用数字人播报推荐理由
      if (data.reason) {
        const entranceName = ENTRANCE_MAP[snapshot.entrance] || '主入口'
        const companionName = COMPANION_MAP[snapshot.company] || '通用'
        const staminaName = STAMINA_MAP[snapshot.stamina] || '适中'
        const spotCount = data.spots?.length || 0
        const speakText = `${data.reason} 本路线从${entranceName}出发，专为「${companionName}」游客设计，游览节奏「${staminaName}」，全程约${data.total_minutes || 0}分钟步行${data.walking_distance || 0}米，共串联${spotCount}个景点。`
        setTimeout(() => ttsSpeak(speakText), 500)
      }
    } catch (e: any) { setError(e.message || '生成失败') }
    finally { setLoading(false) }
  }

  /** 查询附近景点 — 可用重定位参考景点或默认预设定位 */
  async function fetchNearbySpots(spotId?: string) {
    setNearbyLoading(true); setNearbyError('')
    try {
      let r: any
      if (spotId) {
        r = await getNearbySpots(spotId) as any
      } else {
        r = await getNearbySpots(undefined, DEFAULT_LAT, DEFAULT_LNG) as any
      }
      setNearbySpots(r.nearby || [])
    } catch (e: any) {
      setNearbyError(e.message || '获取失败')
    } finally { setNearbyLoading(false) }
  }

  const p = Object.keys(genPrefs).length > 0 ? genPrefs : prefs

  const stops = routeData?.spots?.length
    ? routeData.spots.map((s: any, i: number) => ({ index: i + 1, name: s.spot_name, spot_id: s.spot_id }))
    : []

  const stats = routeData ? [
    { key: 'time', label: '预计用时', value: `${routeData.total_minutes || 0}分钟`, icon: Clock },
    { key: 'distance', label: '步行距离', value: `${routeData.walking_distance || 0}米`, icon: Footprints },
    { key: 'crowd', label: '适合人群', value: COMPANION_MAP[p.company] || '通用', icon: Users },
    { key: 'intensity', label: '路线强度', value: STAMINA_MAP[p.stamina] || '普通', icon: Signpost },
  ] : []

  const reason = routeData?.reason
    ? `${routeData.reason} 本路线从${ENTRANCE_MAP[p.entrance] || '主入口'}出发，专为「${COMPANION_MAP[p.company] || '通用'}」游客设计，游览节奏「${STAMINA_MAP[p.stamina] || '适中'}」，全程约${routeData.total_minutes || 0}分钟步行${routeData.walking_distance || 0}米，共串联${stops.length}个景点。`
    : mockReason

  const routeName = routeData?.route_name || ''
  const mapSpots = (routeData?.spots || []).map((s: any) => ({ name: s.spot_name, spot_id: s.spot_id }))

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <div>
        <h2 className="inline-block border-b-2 border-primary pb-1 text-2xl font-bold text-foreground">个性化路线</h2>
      </div>

      {/* 顶部横幅 */}
      <div className="relative mt-4 overflow-hidden rounded-xl shadow-[0_6px_18px_rgb(80,120,200,0.18)]">
        <img src="/route-banner.png" alt="" className="h-28 w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.9_0.06_255)] via-[oklch(0.92_0.05_255)]/70 to-transparent" />
        <div className="absolute inset-y-0 left-0 flex flex-col justify-center p-5">
          <h3 className="text-lg font-bold text-slate-800">定制您的专属游览方案</h3>
          <p className="mt-1 max-w-md text-xs text-slate-600">根据时间、兴趣与出行人群，智能生成更合适的灵山胜境路线</p>
        </div>
      </div>

      {/* 路线偏好设置 — 可折叠 */}
      <div className="mt-3 rounded-2xl border border-white/60 bg-white/60 px-4 py-3">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setPrefsExpanded((v) => !v)}
          onKeyDown={(e) => e.key === 'Enter' && setPrefsExpanded((v) => !v)}
          className="flex w-full cursor-pointer items-center justify-between mb-2"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <SlidersHorizontal className="size-4 text-primary" />
            路线偏好设置
            {!prefsExpanded && Object.keys(genPrefs).length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                — {TIME_MAP[p.time]} · {routePrefs.find(r => r.key === 'interest')?.options.find(o => o.key === p.interest)?.label} · {COMPANION_MAP[p.company]}
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {!prefsExpanded && (
              <button onClick={(e) => { e.stopPropagation(); generateRoute() }} disabled={loading}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                {loading ? '生成中...' : '重新生成'}
              </button>
            )}
            <ChevronDown className={cn('size-5 text-muted-foreground transition-transform', prefsExpanded && 'rotate-180')} />
          </div>
        </div>

        {prefsExpanded && (
          <div className="flex flex-col gap-3">
            {/* 参数行 — 下拉框 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {routePrefs.map((row) => (
                <label key={row.key} className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">{row.title}</span>
                  <div className="relative">
                    <select
                      value={prefs[row.key]}
                      onChange={(e) => setPrefs((pr) => ({ ...pr, [row.key]: e.target.value }))}
                      className="w-full appearance-none rounded-lg border border-border bg-white px-3 py-2 pr-8 text-sm text-foreground outline-none transition-colors hover:border-primary/40 focus:border-primary"
                    >
                      {row.options.map((opt) => (
                        <option key={opt.key} value={opt.key}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </label>
              ))}
            </div>

            {/* 必去景点 + 看演出 */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">想去的景点：</span>
                <div className="flex flex-wrap gap-1.5">
                  {TOP_SPOTS.map(name => {
                    const active = mustSpots.includes(name)
                    return (
                      <button key={name} type="button"
                        onClick={() => setMustSpots(prev => active ? prev.filter(s => s !== name) : [...prev, name])}
                        className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-white text-muted-foreground hover:bg-secondary'}`}>
                        {name}{active ? ' ✓' : ' +'}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">是否看演出：</span>
                <button type="button" onClick={() => setWantShows(v => !v)}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${wantShows ? 'bg-primary' : 'bg-secondary'}`}>
                  <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${wantShows ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
                <span className="text-xs text-muted-foreground">{wantShows ? '对齐演出时间' : '不看演出'}</span>
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            {/* 生成按钮 */}
            <button onClick={generateRoute} disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-[0_6px_16px_rgb(80,120,200,0.28)] transition-colors hover:bg-primary/90 disabled:opacity-50">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loading ? '正在生成...' : 'AI 生成路线'}
            </button>
          </div>
        )}
      </div>

      {/* 路线卡片 — GPS 地图 + 双模式切换 */}
      <div className="mt-4 rounded-2xl border border-white/60 bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.10)]">
        {/* 模式切换标签 */}
        <div className="flex items-center gap-1 mb-3">
          <button type="button" onClick={() => { setNearbyMode(false) }}
            className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', !nearbyMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary')}>
            🗺️ 主题路线
          </button>
          <button type="button" onClick={() => { setNearbyMode(true); if (nearbySpots.length === 0) fetchNearbySpots() }}
            className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', nearbyMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary')}>
            📍 附近景点
          </button>
          {routeData && !nearbyMode && (
            <span className="ml-2 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-600">已生成</span>
          )}
        </div>

        {/* === 路线模式 === */}
        {!nearbyMode && (<>
          <h3 className="text-base font-bold text-foreground mb-3">
            {routeName ? `推荐路线：${routeName}` : '路线预览'}
          </h3>

        <div className="mt-3 flex flex-col gap-4">
          {/* 景点配图横排 */}
          {routeData && stops.length > 0 ? (
            <div className="space-y-3">
              {/* 地图始终可见 */}
              <button type="button" onClick={() => setMapZoomed(true)}
                className="group relative aspect-[2/1] w-full cursor-zoom-in overflow-hidden rounded-lg"
                aria-label="点击放大">
                <AmapRoute spots={mapSpots} className="h-full w-full" entrance={p.entrance || 'main'} />
                <span className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-md bg-black/45 px-2 py-1 text-[11px] font-medium text-white">
                  <Maximize2 className="size-3" />点击放大
                </span>
              </button>
              {/* 景点卡片横排 */}
              <div className="flex gap-3 overflow-x-auto pb-1">
                {stops.map((s: any) => (
                  <div key={s.spot_id} className="shrink-0 w-40 rounded-lg overflow-hidden border border-white/60 shadow-sm">
                    <div className="aspect-[4/3] bg-secondary/30">
                      <img src={`/${s.spot_id}.jpg`} alt={s.name}
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                    <div className="px-2 py-1.5 bg-white/80 backdrop-blur-sm">
                      <p className="text-xs font-medium text-foreground truncate">{s.index}. {s.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setMapZoomed(true)}
              className="group relative aspect-[2/1] w-full cursor-zoom-in overflow-hidden rounded-lg"
              aria-label="点击放大">
              <AmapRoute spots={mapSpots} className="h-full w-full" entrance={p.entrance || 'main'} />
              <span className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-md bg-black/45 px-2 py-1 text-[11px] font-medium text-white">
                <Maximize2 className="size-3" />点击放大
              </span>
            </button>
          )}

          {routeData ? (
          <div className="flex gap-4">
            <div className="flex shrink-0 flex-col justify-center gap-0 min-w-[120px]">
              {stops.map((s: any, i: number) => (
                <div key={s.index} className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{s.index}</span>
                    <span className="text-sm font-medium text-foreground whitespace-nowrap">{s.name}</span>
                  </div>
                  {i < stops.length - 1 && <span className="my-0.5 h-3 w-px bg-border" />}
                </div>
              ))}
            </div>
            <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border bg-secondary/40 p-3">
              <dl className="grid gap-2">
                {stats.map((st: any) => (
                  <div key={st.key} className="flex items-center gap-2 text-sm">
                    <st.icon className="size-4 shrink-0 text-primary" />
                    <dt className="text-muted-foreground whitespace-nowrap">{st.label}：</dt>
                    <dd className="font-medium text-foreground whitespace-nowrap">{st.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-2 border-t border-border pt-2">
                <p className="text-sm font-semibold text-foreground">推荐理由：
                  <button type="button" onClick={() => { routeSpeaking ? ttsStop() : ttsSpeak(reason) }}
                    className={`ml-2 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${routeSpeaking ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>
                    {routeSpeaking ? '⏹ 停止' : '🎙 数字人讲'}
                  </button>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{reason}</p>
              </div>
            </div>
          </div>
          ) : (
          <div className="flex items-center justify-center rounded-xl border border-border bg-secondary/40 p-6">
            <p className="text-sm text-muted-foreground">设置上方偏好后，点击「AI 生成路线」</p>
          </div>
          )}
        </div>

        {routeData && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => { setPrefsExpanded(true) }}
            className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
            <SlidersHorizontal className="size-4 text-primary" />调整偏好
          </button>
          <button type="button" onClick={generateRoute} disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_6px_16px_rgb(80,120,200,0.28)] transition-colors hover:bg-primary/90 disabled:opacity-50">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}重新生成路线
          </button>
          <button type="button" onClick={() => { setPrefs(p => ({ ...p, stamina: 'easy' })); setPrefsExpanded(false); setTimeout(generateRoute, 100) }}
            className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
            <Leaf className="size-4 text-primary" />改成轻松路线
          </button>
          <button type="button" onClick={() => onQuestionClick?.(`给我讲讲${stops[0]?.name || '第一站'}`)}
            className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
            <Volume2 className="size-4 text-primary" />讲解第一站
          </button>
          <button type="button" onClick={() => onQuestionClick?.('请帮我优化这条游览路线，调整景点顺序或替换更合适的景点')}
            className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
            <Sparkles className="size-4 text-primary" />AI 优化路线
          </button>
        </div>
        )}

        {/* 演出提醒 — 路线模式下显示 */}
        {!nearbyMode && showReminders.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="size-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-700">演出提醒</span>
            </div>
            {showReminders.map((r, i) => (
              <p key={i} className="text-xs text-amber-600 ml-6">{r}</p>
            ))}
          </div>
        )}
        </>)} {/* 路线模式结束 */}

        {/* === 附近景点模式 === */}
        {nearbyMode && (
          <div>
            {nearbyLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="size-5 animate-spin mr-2" />正在获取附近景点...
              </div>
            ) : nearbyError ? (
              <div className="flex items-center justify-center py-8 text-sm text-red-500">
                {nearbyError}，<button type="button" onClick={fetchNearbySpots} className="underline">重试</button>
              </div>
            ) : nearbySpots.length > 0 ? (
              <>
                <ul className="space-y-2">
                  {nearbySpots.map((s) => (
                    <li key={s.spot_id} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-3">
                      <MapPin className="size-4 shrink-0 text-blue-500" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground">{s.spot_name}</span>
                        {s.location && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{s.location}</p>}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        步行 {s.distance_m < 1000 ? `${s.distance_m}m` : `${(s.distance_m/1000).toFixed(1)}km`}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>当前位置：</span>
                  <select value={relocateSpot} onChange={(e) => {
                    const v = e.target.value; setRelocateSpot(v)
                    if (v) { fetchNearbySpots(v) } else { fetchNearbySpots() }
                  }}
                    className="rounded-lg border border-border bg-white px-2 py-1 text-xs outline-none focus:border-primary">
                    <option value="">灵山大佛与梵宫之间（默认）</option>
                    {RELOCATE_SPOTS.map((s) => (
                      <option key={s.spot_id} value={s.spot_id}>{s.name}</option>
                    ))}
                  </select>
                  <button type="button" onClick={locateByGPS} disabled={gpsLoading}
                    className="underline hover:text-foreground disabled:opacity-50">
                    {gpsLoading ? '📍 定位中...' : '📍 精准GPS定位'}
                  </button>
                  <span>| 500米范围内</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">附近暂无景点</div>
            )}
          </div>
        )}
      </div>

      {/* 地图放大弹窗 */}
      {mapZoomed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setMapZoomed(false)} role="dialog" aria-modal="true">
          <div className="relative max-h-full w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{routeName || '路线'} · 地图</p>
              <button type="button" onClick={() => setMapZoomed(false)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary" aria-label="关闭">
                <X className="size-5" />
              </button>
            </div>
            <div className="relative aspect-[4/3] w-full">
              <AmapRoute spots={mapSpots} className="h-full w-full" entrance={p.entrance || 'main'} />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
