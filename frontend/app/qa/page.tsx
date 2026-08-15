'use client'

import { useState, useCallback, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { stop as ttsStop } from '@/lib/tts-controller'
import { TopHeader } from '@/components/top-header'
import { SmartAvatar } from '@/components/smart-avatar'
import { SidebarNav } from '@/components/sidebar-nav'
import { QaChatLive } from '@/components/qa-chat-live'
import { BottomInput } from '@/components/bottom-input'
import { navItems } from '@/lib/mock-data'

export default function QaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">加载中...</p></div>}>
      <QaPageInner />
    </Suspense>
  )
}

function QaPageInner() {
  const searchParams = useSearchParams()
  const [avatarStatus, setAvatarStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle')
  const [dhBubble, setDhBubble] = useState('您好，我可以为您解答景区问题。您可以询问景点历史、开放时间、游玩建议和便民信息。')

  const sendRef = useRef<((msg: string) => void) | null>(null)

  // 从 URL 读取预填问题（不自动发送）+ 路线上下文
  const [prefillQ, setPrefillQ] = useState('')
  const [routeTag, setRouteTag] = useState<{ name: string; count: number; duration: number } | null>(null)

  useEffect(() => {
    const q = searchParams.get('q') || ''
    setPrefillQ(q)
    const onFill = (e: Event) => setPrefillQ((e as CustomEvent).detail)
    window.addEventListener('qa-fill-input', onFill)
    const routeStr = searchParams.get('route')
    if (routeStr) {
      try {
        const rc = JSON.parse(routeStr)
        setRouteTag({ name: rc.name || '当前路线', count: rc.spots?.length || 0, duration: rc.duration || 0 })
      } catch {}
    } else {
      setRouteTag(null)
    }
    return () => window.removeEventListener('qa-fill-input', onFill)
  }, [searchParams])

  const handleSend = useCallback((text: string) => {
    setAvatarStatus('thinking')
    setDhBubble('正在为您查找答案...')
    emitAvatarStatus('thinking', '正在为您查找答案...')
    sendRef.current?.(text)
  }, [])

  // 同步状态到全局数字人
  function emitAvatarStatus(status: string, bubble?: string) {
    window.dispatchEvent(new CustomEvent('avatar-status', { detail: { status, bubble } }))
  }

  // QaChatLive 通过这个回调回传状态
  const handleStateChange = useCallback((state: 'idle' | 'thinking' | 'speaking', bubble?: string) => {
    setAvatarStatus(state)
    if (bubble) setDhBubble(bubble)
    emitAvatarStatus(state, bubble)
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-30 bg-gradient-to-b from-sky-200 via-sky-100 to-[oklch(0.93_0.04_235)]" />
      <img src="/bg-main.jpg" alt="" aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover object-[8%_20%] opacity-85" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-sky-100/40 via-background/50 to-background/80" />

      <TopHeader />

      <main className="mx-auto flex w-full max-w-[1600px] items-start gap-6 px-6 pb-10 lg:px-10">
        <SmartAvatar bubbleText={dhBubble} showStatus status={avatarStatus} />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex min-w-0 items-stretch gap-6 rounded-3xl border border-white/60 bg-card/45 p-5 shadow-[0_16px_50px_rgb(80,120,200,0.10)] backdrop-blur-md lg:p-6">
            <SidebarNav items={navItems} activeKey="qa" />
            <div className="w-px shrink-0 self-stretch bg-border" />
            <QaChatLive
              onSendReady={(fn) => { sendRef.current = fn }}
              onStateChange={handleStateChange}
            />
          </div>

          {/* 路线上下文标签 */}
          {routeTag && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
              <span className="text-primary font-medium">📋 正在咨询「{routeTag.name}」</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground text-xs">{routeTag.count} 个景点</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground text-xs">{routeTag.duration} 分钟</span>
            </div>
          )}

          <BottomInput placeholder="请输入您想问的问题...." variant="mic" showTags onSend={handleSend} initialValue={prefillQ} isSpeaking={avatarStatus === 'speaking'} onStopSpeak={() => { ttsStop(); setAvatarStatus('idle') }} />
        </div>
      </main>

      <footer className="flex items-center justify-center gap-4 pb-8 text-sm text-muted-foreground">
        <Sparkles className="size-4 text-primary" />
        <span>智慧旅游 · 美好体验</span>
      </footer>
    </div>
  )
}
