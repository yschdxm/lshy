'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { adminNav } from '@/lib/admin-data'
import { cn } from '@/lib/utils'

export function AdminSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const pathname = usePathname()

  // Determine which groups should be open by default (the one containing the active route)
  const initialOpen = () => {
    const open: Record<string, boolean> = {}
    for (const section of adminNav) {
      for (const item of section.items) {
        if (item.children?.some((c) => pathname === c.href)) open[item.key] = true
      }
    }
    return open
  }
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen)

  const isActive = (href?: string) => href && pathname === href
  const groupHasActive = (item: (typeof adminNav)[number]['items'][number]) =>
    item.children?.some((c) => pathname === c.href)

  return (
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200',
        collapsed ? 'w-[76px]' : 'w-64',
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        {collapsed ? (
          <BrandLogo />
        ) : (
          <div className="leading-tight">
            <div className="flex items-center gap-2.5">
              <img src="/灵境云游_logo_透明底_裁切版 - 单logo图.png" alt="灵境云游" className="h-8" />
              <div>
                <p className="text-base font-bold text-foreground">灵境云游</p>
                <p className="text-[11px] text-muted-foreground">管理后台</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {adminNav.map((section, si) => (
          <div key={section.title || si} className={cn(si > 0 && 'mt-5')}>
            {section.title && !collapsed && (
              <p className="mb-2 px-3 text-[11px] font-medium tracking-wide text-muted-foreground/80">
                {section.title}
              </p>
            )}
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const hasChildren = !!item.children?.length
                const open = openGroups[item.key]
                const active = isActive(item.href) || groupHasActive(item)

                if (hasChildren) {
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenGroups((g) => ({ ...g, [item.key]: !g[item.key] }))
                        }
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                          active
                            ? 'text-primary'
                            : 'text-foreground/80 hover:bg-sidebar-accent',
                        )}
                      >
                        <Icon className="size-5 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">{item.label}</span>
                            <ChevronDown
                              className={cn(
                                'size-4 text-muted-foreground transition-transform',
                                open && 'rotate-180',
                              )}
                            />
                          </>
                        )}
                      </button>
                      {!collapsed && open && (
                        <ul className="mt-1 flex flex-col gap-1 pl-4">
                          {item.children!.map((child) => {
                            const childActive = pathname === child.href
                            return (
                              <li key={child.key}>
                                <Link
                                  href={child.href}
                                  className={cn(
                                    'flex items-center gap-2 rounded-lg py-2 pl-4 pr-3 text-sm transition-colors',
                                    childActive
                                      ? 'bg-primary/10 font-medium text-primary'
                                      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'size-1.5 shrink-0 rounded-full',
                                      childActive ? 'bg-primary' : 'bg-muted-foreground/40',
                                    )}
                                  />
                                  {child.label}
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </li>
                  )
                }

                return (
                  <li key={item.key}>
                    <Link
                      href={item.href!}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground shadow-[0_6px_16px_rgb(80,120,200,0.28)]'
                          : 'text-foreground/80 hover:bg-sidebar-accent',
                      )}
                    >
                      <Icon className="size-5 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-5 shrink-0" />
          ) : (
            <PanelLeftClose className="size-5 shrink-0" />
          )}
          {!collapsed && <span>收起菜单</span>}
        </button>
      </div>
    </aside>
  )
}
