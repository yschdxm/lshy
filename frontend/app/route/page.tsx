'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Sparkles, X, MapPin, Clock, Footprints } from 'lucide-react'
import { TopHeader } from '@/components/top-header'
import { SmartAvatar } from '@/components/smart-avatar'
import { SidebarNav } from '@/components/sidebar-nav'
import { RouteCenter } from '@/components/route-center'
import { RoutePanel } from '@/components/route-panel'
import { BottomInput } from '@/components/bottom-input'
import { navItems } from '@/lib/mock-data'
import { onTTSStateChange } from '@/lib/tts-controller'

export default function RoutePage() {
  const [routeData, setRouteData] = useState<any>(null)
  const [currentPrefs, setCurrentPrefs] = useState<Record<string, string>>({})
  const centerPrefsRef = useRef<((p: Record<string, string>) => void) | null>(null)
  const [avatarStatus, setAvatarStatus] = useState<'idle' | 'speaking'>('idle')
  const [dhBubble, setDhBubble] = useState('您好，我来为您规划专属路线。')
  // 跳转确认弹窗
  const [confirmModal, setConfirmModal] = useState<{ q: string; routeContext: string } | null>(null)

  // TTS 播报状态同步
  useEffect(() => onTTSStateChange((state) => {
    setAvatarStatus(state)
  }), [])

  const handleRouteResult = useCallback((data: any, prefs: Record<string, string>) => {
    setRouteData(data)
    setCurrentPrefs(prefs)
    if (data?.route_name) {
      const spots = (data.spots || []).map((s: any) => s.spot_name).join(' → ')
      setDhBubble(`已为您生成「${data.route_name}」：${spots}，共${data.total_minutes || '?'}分钟`)
    }
  }, [])

  const handleQuestionClick = useCallback((q: string, routeContext?: string) => {
    if (routeContext) {
      setConfirmModal({ q, routeContext })
    } else {
      window.open(`/qa?q=${encodeURIComponent(q)}`, '_self')
    }
  }, [])

  function doJump() {
    if (!confirmModal) return
    const { q, routeContext } = confirmModal
    window.open(`/qa?q=${encodeURIComponent(q)}&route=${encodeURIComponent(routeContext)}`, '_self')
    setConfirmModal(null)
  }

  // 底部输入框：自然语言微调路线
  function handleBottomSend(msg: string) {
    if (!routeData) {
      // 没有路线时，用自然语言描述跳转 QA 生成
      handleQuestionClick(msg, undefined)
      return
    }
    const routeContext = JSON.stringify({
      name: routeData.route_name,
      spots: (routeData.spots || []).map((s: any) => s.spot_name),
      duration: routeData.total_minutes,
      distance: routeData.walking_distance,
    })
    // 用自然语言 + 当前路线数据，让 Agent 理解需求
    const q = `我当前有一条路线：${routeData.route_name}。请根据以下需求帮我优化：${msg}`
    setConfirmModal({ q, routeContext })
  }

  const handlePresetClick = useCallback((prefs: Record<string, string>) => {
    if (centerPrefsRef.current) centerPrefsRef.current(prefs)
  }, [])

  // 解析路线上下文用于展示
  let routePreview: any = null
  if (confirmModal) {
    try { routePreview = JSON.parse(confirmModal.routeContext) } catch {}
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-30 bg-gradient-to-b from-sky-200 via-sky-100 to-[oklch(0.93_0.04_235)]" />
      <img src="/背景底图.jpg" alt="" aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover object-[8%_20%] opacity-85" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-sky-100/40 via-background/50 to-background/80" />

      <TopHeader />

      <main className="mx-auto flex w-full max-w-[1600px] items-start gap-6 px-6 pb-10 lg:px-10">
        <SmartAvatar bubbleText={dhBubble} showStatus status={avatarStatus} />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex min-w-0 items-stretch gap-6 rounded-3xl border border-white/60 bg-card/45 p-5 shadow-[0_16px_50px_rgb(80,120,200,0.10)] backdrop-blur-md lg:p-6">
            <SidebarNav items={navItems} activeKey="route" />
            <div className="w-px shrink-0 self-stretch bg-border" />
            <RouteCenter onRouteResult={handleRouteResult} onQuestionClick={handleQuestionClick} onPresetRef={(fn) => { centerPrefsRef.current = fn }} />
            <RoutePanel routeData={routeData} prefs={currentPrefs} onQuestionClick={handleQuestionClick} onPresetClick={handlePresetClick} />
          </div>
          <BottomInput placeholder="描述你想怎么调整路线，如「我想多点自然风光」「帮我把九龙灌浴换成降魔浮雕」..." showTags={false} variant="mic" onSend={handleBottomSend} />
        </div>
      </main>

      {/* 路线数据传递确认弹窗 */}
      {confirmModal && routePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setConfirmModal(null)} role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="text-base font-bold text-foreground">📋 将路线数据发送给 AI</h3>
              <button onClick={() => setConfirmModal(null)} className="flex size-8 items-center justify-center rounded-full hover:bg-secondary">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm font-semibold text-foreground">{routePreview.name || '当前路线'}</p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="size-3" />{(routePreview.spots || []).length} 个景点</span>
                <span className="flex items-center gap-1"><Clock className="size-3" />{routePreview.duration || 0} 分钟</span>
                <span className="flex items-center gap-1"><Footprints className="size-3" />{routePreview.distance || 0}m</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">景点：{(routePreview.spots || []).join(' → ')}</p>
              <p className="text-xs text-muted-foreground">AI 将基于此路线数据回答你的问题，使回答更加精准。</p>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setConfirmModal(null)}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm text-foreground hover:bg-secondary">取消</button>
                <button onClick={doJump}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">确认并跳转</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="flex items-center justify-center gap-4 pb-8 text-sm text-muted-foreground">
        <Sparkles className="size-4 text-primary" />
        <span>智慧旅游 · 美好体验</span>
      </footer>
    </div>
  )
}
