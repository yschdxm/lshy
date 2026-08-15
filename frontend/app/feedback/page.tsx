import { Sparkles } from 'lucide-react'
import { TopHeader } from '@/components/top-header'
import { SmartAvatar } from '@/components/smart-avatar'
import { SidebarNav } from '@/components/sidebar-nav'
import { FeedbackCenter } from '@/components/feedback-center'
import { FeedbackPanel } from '@/components/feedback-panel'
import { navItems } from '@/lib/mock-data'

export default function FeedbackPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Base sky-blue gradient wash */}
      <div className="pointer-events-none fixed inset-0 -z-30 bg-gradient-to-b from-sky-200 via-sky-100 to-[oklch(0.93_0.04_235)]" />

      {/* Lingshan Grand Buddha scenic background */}
      <img
        src="/bg-main.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover object-[8%_20%] opacity-85"
      />
      {/* Soften the imagery so foreground content stays readable */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-sky-100/40 via-background/50 to-background/80" />

      <TopHeader />

      <main className="mx-auto flex w-full max-w-[1600px] items-start gap-6 px-6 pb-10 lg:px-10">
        <SmartAvatar bubbleText="感谢您的反馈！您的意见对我们非常重要，我们会持续改进，为您提供更好的服务！" />

        {/* Frosted content panel */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex min-w-0 items-stretch gap-6 rounded-3xl border border-white/60 bg-card/45 p-5 shadow-[0_16px_50px_rgb(80,120,200,0.10)] backdrop-blur-md lg:p-6">
            {/* Left navigation */}
            <SidebarNav items={navItems} activeKey="feedback" />

            {/* Vertical divider between nav and content */}
            <div className="w-px shrink-0 self-stretch bg-border" />

            {/* Center feedback form */}
            <FeedbackCenter />

            {/* Right info panel */}
            <FeedbackPanel />
          </div>
        </div>
      </main>

      <footer className="flex items-center justify-center gap-4 pb-8 text-sm text-muted-foreground">
        <Sparkles className="size-4 text-primary" />
        <span>智慧旅游 · 美好体验</span>
      </footer>
    </div>
  )
}
