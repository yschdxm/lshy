'use client'

import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { TopHeader } from '@/components/top-header'
import { SmartAvatar } from '@/components/smart-avatar'
import { HeroBanner } from '@/components/hero-banner'
import { ServiceGrid } from '@/components/service-grid'
import { RightPanelLive } from '@/components/right-panel-live'
import { QuickAccess } from '@/components/quick-access'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export default function HomePage() {
  const [greeting, setGreeting] = useState('您好')

  useEffect(() => { setGreeting(getGreeting()) }, [])
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Base sky-blue gradient wash */}
      <div className="pointer-events-none fixed inset-0 -z-30 bg-gradient-to-b from-sky-200 via-sky-100 to-[oklch(0.93_0.04_235)]" />

      {/* Lingshan Grand Buddha scenic background */}
      <img
        src="/背景底图.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover object-[8%_20%] opacity-85"
      />
      {/* Soften the imagery so foreground content stays readable */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-sky-100/40 via-background/50 to-background/80" />

      <TopHeader />

      <main className="mx-auto flex w-full max-w-[1600px] items-start gap-6 px-6 pb-10 lg:px-10">
        <SmartAvatar />

        {/* Frosted content panel wrapping everything except the digital human */}
        <div className="flex min-w-0 flex-1 flex-col gap-6 rounded-3xl border border-white/60 bg-card/45 p-5 shadow-[0_16px_50px_rgb(80,120,200,0.10)] backdrop-blur-md lg:p-6">
          <div className="grid grid-cols-[1fr_auto] gap-6 items-stretch">
            {/* Center content */}
            <section className="min-w-0">
              <div className="mb-2">
                <h2 className="text-3xl font-bold text-foreground text-balance">
                  {greeting}，今天想体验什么服务？
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  智能导览、个性化推荐与贴心服务一站式体验
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-8">
                <HeroBanner />
                <ServiceGrid />
              </div>
            </section>

            {/* Right info column */}
            <RightPanelLive />
          </div>

          {/* Quick access spans the full panel width */}
          <QuickAccess />
        </div>
      </main>

      <footer className="flex items-center justify-center gap-4 pb-8 text-sm text-muted-foreground">
        <Sparkles className="size-4 text-primary" />
        <span>智慧旅游 · 美好体验</span>
      </footer>
    </div>
  )
}
