import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[oklch(0.9_0.06_255)] to-[oklch(0.94_0.03_255)] shadow-[0_6px_18px_rgb(80,120,200,0.18)]">
      <img
        src="/banner-scenic.png"
        alt="智慧游览山水插画"
        className="absolute inset-y-0 right-0 h-full w-full object-cover object-right"
      />
      {/* Fade the image into the card on the left so there is no hard edge */}
      <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.9_0.06_255)] via-[oklch(0.92_0.05_255)]/85 via-35% to-transparent to-75%" />
      <div className="relative z-10 max-w-md p-8">
        <h3 className="text-2xl font-bold text-slate-800 text-balance">
          开启您的智慧游览之旅
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 text-pretty">
          智能科技与人文风景的完美融合，让每一次旅行都更省心、更精彩。
        </p>
        <a href="/qa">
          <Button className="mt-6 rounded-full px-5 shadow-md">
            立即探索
            <ArrowRight className="size-4" />
          </Button>
        </a>
      </div>
    </div>
  )
}
