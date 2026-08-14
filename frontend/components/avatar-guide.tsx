'use client'

import { Smile, Volume2 } from 'lucide-react'

const DEFAULT_BUBBLE = '您好，欢迎来到灵境云游智慧景区服务平台！我是您的专属导览助手。'

type AvatarGuideProps = {
  bubbleText?: string
  showStatus?: boolean
  status?: 'idle' | 'listening' | 'thinking' | 'speaking'
}

const STATUS_LABELS: Record<string, string> = {
  idle: '在线', listening: '倾听中...', thinking: '思考中...', speaking: '讲解中...',
}

export function AvatarGuide({ bubbleText = DEFAULT_BUBBLE, showStatus = false, status = 'idle' }: AvatarGuideProps) {
  return (
    <aside className="relative hidden w-75 shrink-0 xl:block 2xl:w-96">
      <div className="relative z-10 mx-auto mb-2 max-w-[18rem] rounded-2xl rounded-bl-sm border border-white/60 bg-card/70 p-4 text-sm leading-relaxed text-foreground shadow-[0_8px_30px_rgb(80,120,200,0.12)] backdrop-blur-md">
        {bubbleText}
      </div>

      <img src="/digital-human.png" alt="AI 数字人"
        className="pointer-events-none w-full select-none object-contain"
        style={{
          WebkitMaskImage: 'radial-gradient(ellipse 78% 92% at 50% 42%, #000 55%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 78% 92% at 50% 42%, #000 55%, transparent 100%)',
        }}
      />

      {showStatus && (
        <div className="relative z-10 -mt-6 flex items-center gap-3 pl-2">
          <button type="button" aria-label="语音"
            className={`flex size-11 shrink-0 items-center justify-center rounded-full border border-white/60 bg-card/70 shadow-[0_6px_16px_rgb(80,120,200,0.16)] backdrop-blur-md transition-colors ${status === 'speaking' ? 'text-emerald-500 animate-pulse' : 'text-primary'}`}>
            <Volume2 className="size-5" />
          </button>
          <div className="flex-1 rounded-2xl border border-white/60 bg-card/70 px-4 py-3 shadow-[0_8px_24px_rgb(80,120,200,0.12)] backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Smile className="size-4 text-primary" />
              <span>当前状态：</span>
            </div>
            <p className={`mt-1 font-semibold ${status === 'speaking' ? 'text-emerald-600' : status === 'thinking' ? 'text-amber-600' : 'text-foreground'}`}>{STATUS_LABELS[status] || '在线'}</p>
            {status === 'listening' && (
              <div className="mt-2 flex items-end gap-0.5" aria-hidden="true">
                {[6,10,16,22,14,8,18,24,12,7,15,20,10,6,14].map((h,i) => (
                  <span key={i} className="w-1 rounded-full bg-primary/70 animate-pulse" style={{ height: `${h}px`, animationDelay: `${i*0.06}s` }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
