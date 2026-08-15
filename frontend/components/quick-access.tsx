import Link from 'next/link'
import { quickAccess } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

// 需要预填问题的快捷入口
// 注意：href 中的中文必须 URL 编码，否则 Next.js 客户端导航时会抛
// "Cannot convert argument to a ByteString"（内部请求头只允许 Latin-1 字符）
const PREFILL_MAP: Record<string, string> = {
  '景区开放时间': `/qa?q=${encodeURIComponent('灵山胜境的开放时间是几点？')}`,
}

export function QuickAccess() {
  return (
    <div className="rounded-xl bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.16)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <h3 className="shrink-0 font-bold text-foreground">快捷入口</h3>
        <div className="grid flex-1 grid-cols-2 gap-3 lg:grid-cols-4">
          {quickAccess.map((item) => (
            <Link
              key={item.label}
              href={PREFILL_MAP[item.label] || item.href}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/60 bg-secondary/60 px-3 py-3 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-accent"
            >
              <item.icon className={cn('size-5 shrink-0', item.iconColor)} />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
