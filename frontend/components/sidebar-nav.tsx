import Link from 'next/link'
import type { NavItem } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

type SidebarNavProps = {
  /** 导航项；不传则不渲染（用作预留空壳） */
  items?: NavItem[]
  /** 当前高亮项的 key */
  activeKey?: string
  className?: string
}

/**
 * SidebarNav — 左侧导航
 *
 * 传入 `items` 后渲染带图标的垂直导航，`activeKey` 控制高亮项。
 * 不传 `items` 时返回 null，可作为占位空壳复用。
 */
export function SidebarNav({ items = [], activeKey, className }: SidebarNavProps) {
  if (items.length === 0) return null

  return (
    <nav
      className={cn(
        'flex w-28 shrink-0 flex-col gap-1.5 py-1',
        className,
      )}
      aria-label="侧边导航"
    >
      {items.map((item) => {
        const isActive = item.key === activeKey
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground shadow-[0_6px_16px_rgb(80,120,200,0.28)]'
                : 'text-foreground hover:bg-secondary',
            )}
          >
            <item.icon className="size-[18px] shrink-0" />
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
