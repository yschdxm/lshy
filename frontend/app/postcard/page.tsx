import { Sparkles } from 'lucide-react'
import { TopHeader } from '@/components/top-header'
import { SmartAvatar } from '@/components/smart-avatar'
import { SidebarNav } from '@/components/sidebar-nav'
import { PostcardCenter } from '@/components/postcard-center'
import { navItems } from '@/lib/mock-data'

export default function PostcardPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-30 bg-gradient-to-b from-sky-200 via-sky-100 to-[oklch(0.93_0.04_235)]" />
      <img src="/背景底图.jpg" alt="" aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover object-[8%_20%] opacity-85" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-sky-100/40 via-background/50 to-background/80" />

      <TopHeader />

      <main className="mx-auto flex w-full max-w-[1600px] items-start gap-6 px-6 pb-10 lg:px-10">
        <SmartAvatar bubbleText="您好，我可以帮您制作专属景区明信片。选择景点、风格与寄语，AI 还能基于您的游览记录自动生成文案，把美好记忆带回家。" />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex min-w-0 items-stretch gap-6 rounded-3xl border border-white/60 bg-card/45 p-5 shadow-[0_16px_50px_rgb(80,120,200,0.10)] backdrop-blur-md lg:p-6">
            <SidebarNav items={navItems} activeKey="postcard" />
            <div className="w-px shrink-0 self-stretch bg-border" />
            <PostcardCenter />
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
