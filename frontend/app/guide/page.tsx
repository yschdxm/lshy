'use client'

import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { TopHeader } from '@/components/top-header'
import { SmartAvatar } from '@/components/smart-avatar'
import { SidebarNav } from '@/components/sidebar-nav'
import { GuideCenter } from '@/components/guide-center'
import { GuidePanel } from '@/components/guide-panel'
import { BottomInput } from '@/components/bottom-input'
import { navItems } from '@/lib/mock-data'
import { useSpots } from '@/lib/data-adapter'
import { onTTSStateChange } from '@/lib/tts-controller'

// 景点配图映射（与 guide-center 同步）
const SPOT_IMAGES: Record<string, string> = {
  '灵山大照壁': '/LS-001.jpg', '五明桥': '/LS-002.jpg', '佛足坛': '/LS-003.jpg',
  '五智门': '/LS-004.jpg', '山门殿': '/LS-004.jpg', '菩提大道': '/LS-005.jpg',
  '九龙灌浴': '/LS-006.jpg', '降魔浮雕': '/LS-007.jpg', '阿育王柱': '/LS-008.jpg',
  '百子戏弥勒': '/LS-009.jpg', '弥勒戏沙图': '/LS-009.jpg',
  '祥符禅寺': '/LS-010.jpg', '灵山大佛': '/LS-011.jpg',
  '佛教文化博览馆': '/LS-012.jpg', '佛教文化博物馆': '/LS-012.jpg',
  '灵山梵宫': '/LS-013.jpg', '五印坛城': '/LS-014.jpg',
  '曼飞龙塔': '/LS-015.jpg', '曼荼罗塔': '/LS-015.jpg', '无尽意斋': '/LS-016.jpg',
  '拈花广场': '/NH-001.jpg', '四季花海': '/NH-002.jpg', '梵天花海': '/NH-002.jpg',
  '禅意商街': '/NH-003.jpg', '香月花街': '/NH-003.jpg', '拈花堂': '/NH-004.jpg',
}

export default function GuidePage() {
  const { spots } = useSpots()
  // 共享状态
  const [currentSpot, setCurrentSpot] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('spot') || '灵山大佛'
    }
    return '灵山大佛'
  })
  const [currentStyle, setCurrentStyle] = useState('history')
  const [currentDuration, setCurrentDuration] = useState('standard')
  const [isPlaying, setIsPlaying] = useState(false)
  const [avatarStatus, setAvatarStatus] = useState<'idle' | 'speaking'>('idle')
  const [dhBubble, setDhBubble] = useState('您好，我来为您讲解景区精彩内容。您可以选择景点、讲解时长和讲解风格，沉浸式了解景点故事与文化。')

  // TTS 播报状态同步
  useEffect(() => onTTSStateChange((state) => {
    setAvatarStatus(state)
    if (state === 'idle') setDhBubble('您好，您还可以选择其他景点，或者追问您感兴趣的内容。')
  }), [])

  function handleSpotClick(name: string) {
    setCurrentSpot(name)
  }

  function handleQuestionClick(q: string) {
    // 跳转到智能问答，带上问题和当前景点
    const params = new URLSearchParams({ q, spot: currentSpot })
    window.open(`/qa?${params.toString()}`, '_self')
  }

  function handleMoreClick() {
    // 展开景点列表（通过 GuideCenter 的 spotsOpen 状态）
    // 简单地滚动到景点选择区
    window.scrollTo({ top: 300, behavior: 'smooth' })
  }

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
            <SidebarNav items={navItems} activeKey="guide" />
            <div className="w-px shrink-0 self-stretch bg-border" />
            <GuideCenter
              externalSpot={currentSpot}
              onStateChange={({ spot, style, duration, playing }) => {
                if (spot) { setCurrentSpot(spot); setDhBubble(`正在为您讲解「${spot}」`) }
                if (style) setCurrentStyle(style)
                if (duration) setCurrentDuration(duration)
                setIsPlaying(playing)
              }}
            />
            <GuidePanel
              spotName={currentSpot}
              style={currentStyle}
              duration={currentDuration}
              playing={isPlaying}
              onSpotClick={handleSpotClick}
              onQuestionClick={handleQuestionClick}
              onMoreClick={handleMoreClick}
              spots={spots.map(s => ({ name: s.spot_name, spot_id: s.spot_id, image: SPOT_IMAGES[s.spot_name] || '' }))}
            />
          </div>

          <BottomInput placeholder="继续追问景点细节，或告诉我您想听哪个景点的讲解..." showTags={false} variant="mic" />
        </div>
      </main>

      <footer className="flex items-center justify-center gap-4 pb-8 text-sm text-muted-foreground">
        <Sparkles className="size-4 text-primary" />
        <span>智慧旅游 · 美好体验</span>
      </footer>
    </div>
  )
}
