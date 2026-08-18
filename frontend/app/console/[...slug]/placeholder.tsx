'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Hammer, ArrowLeft } from 'lucide-react'
import { adminNav } from '@/lib/admin-data'

function resolveLabel(path: string): string {
  for (const section of adminNav) {
    for (const item of section.items) {
      if (item.href === path) return item.label
      const child = item.children?.find((c) => c.href === path)
      if (child) return `${item.label} · ${child.label}`
    }
  }
  return '功能页面'
}

export default function ConsolePlaceholder() {
  const pathname = usePathname()
  const label = resolveLabel(pathname)

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Hammer className="size-8" />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-foreground">{label}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        该模块正在建设中，敬请期待。你可以先前往已上线的工作台、知识文档管理、智能问答管理、景点讲解管理或用户管理模块。
      </p>
      <Link
        href="/console"
        className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
      >
        <ArrowLeft className="size-4" />
        返回工作台
      </Link>
    </div>
  )
}
