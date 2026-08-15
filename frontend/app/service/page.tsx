'use client'

import { useState, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import { TopHeader } from '@/components/top-header'
import { SmartAvatar } from '@/components/smart-avatar'
import { SidebarNav } from '@/components/sidebar-nav'
import { ServiceLive } from '@/components/service-live'
import { ServicePanel } from '@/components/service-panel'
import { BottomInput } from '@/components/bottom-input'
import { navItems } from '@/lib/mock-data'

export default function ServicePage() {
  const [selectedFacility, setSelectedFacility] = useState<any>(null)
  const [hotType, setHotType] = useState('')

  const handleFacilityChange = useCallback((f: any, type: string) => {
    setSelectedFacility(f)
  }, [])

  const handleHotServiceClick = useCallback((key: string) => {
    // 热门服务 key 映射到分类
    setHotType(key)
  }, [])

  const handleQuestionClick = useCallback((q: string) => {
    window.open(`/qa?q=${encodeURIComponent(q)}`, '_self')
  }, [])

  const handleBottomSend = useCallback((msg: string) => {
    window.open(`/qa?q=${encodeURIComponent(msg)}`, '_self')
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-30 bg-gradient-to-b from-sky-200 via-sky-100 to-[oklch(0.93_0.04_235)]" />
      <img src="/bg-main.jpg" alt="" aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover object-[8%_20%] opacity-85" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-sky-100/40 via-background/50 to-background/80" />

      <TopHeader />

      <main className="mx-auto flex w-full max-w-[1600px] items-start gap-6 px-6 pb-10 lg:px-10">
        <SmartAvatar bubbleText="您好，我可以帮您查询景区便民服务。您可以查找卫生间、餐饮、出口、医务室等设施，我也能为您提供路线指引。" />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex min-w-0 items-stretch gap-6 rounded-3xl border border-white/60 bg-card/45 p-5 shadow-[0_16px_50px_rgb(80,120,200,0.10)] backdrop-blur-md lg:p-6">
            <SidebarNav items={navItems} activeKey="service" />
            <div className="w-px shrink-0 self-stretch bg-border" />
            <ServiceLive onFacilityChange={handleFacilityChange} externalType={hotType} />
            <ServicePanel selectedFacility={selectedFacility} onHotServiceClick={handleHotServiceClick} onQuestionClick={handleQuestionClick} />
          </div>

          <BottomInput placeholder="描述你要找的设施，如「最近的洗手间在哪」..." showTags={false} variant="mic" onSend={handleBottomSend} />
        </div>
      </main>

      <footer className="flex items-center justify-center gap-4 pb-8 text-sm text-muted-foreground">
        <Sparkles className="size-4 text-primary" />
        <span>智慧旅游 · 美好体验</span>
      </footer>
    </div>
  )
}
