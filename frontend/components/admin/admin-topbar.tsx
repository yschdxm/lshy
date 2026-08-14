'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getNotifications, markAllRead, type NotificationItem } from '@/lib/admin-api'
import {
  Menu,
  Search,
  Bell,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronRight,
  User,
  Settings,
  LogOut,
} from 'lucide-react'
import { routeMeta, adminNav } from '@/lib/admin-data'
import { cn } from '@/lib/utils'

function navCrumbs(pathname: string): { parent?: string; title: string } | null {
  for (const section of adminNav) {
    for (const item of section.items) {
      if (item.href === pathname) return { parent: section.title || undefined, title: item.label }
      const child = item.children?.find((c) => c.href === pathname)
      if (child) return { parent: item.label, title: child.label }
    }
  }
  return null
}

export function AdminTopbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const meta = routeMeta[pathname] ?? navCrumbs(pathname)
  const crumbs = ['首页']
  if (meta?.parent) crumbs.push(meta.parent)
  crumbs.push(meta?.title ?? '页面')

  const [fullscreen, setFullscreen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [notifs, setNotifs] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // 加载通知
  const loadNotifs = () => {
    getNotifications().then(d => {
      setNotifs(d.items || [])
      setUnreadCount(d.unread || 0)
    }).catch(() => {})
  }
  useEffect(() => { loadNotifs() }, [])

  const handleMarkAllRead = async () => {
    try {
      await markAllRead()
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {}
  }

  // 搜索快捷跳转映射
  const searchJump: Record<string, string> = {
    '工作台': '/console', '仪表盘': '/console', '首页': '/console',
    '知识': '/console/knowledge', '文档': '/console/knowledge', '知识库': '/console/knowledge',
    '分类': '/console/knowledge/category', '类别': '/console/knowledge/category',
    'faq': '/console/knowledge/faq', '问答': '/console/knowledge/faq',
    'qa': '/console/qa', '质量': '/console/qa',
    '大屏': '/console/screen', '数据': '/console/screen', '屏幕': '/console/screen',
    '行为': '/console/behavior', '分析': '/console/behavior', '游客行为': '/console/behavior',
    '满意度': '/console/satisfaction', '反馈': '/console/satisfaction', '评价': '/console/satisfaction',
    '景点': '/console/spots', '讲解': '/console/spots',
    '路线': '/console/route', '路径': '/console/route',
    '服务': '/console/service', '便民': '/console/service', '设施': '/console/service',
    '用户': '/console/users', '账号': '/console/users',
    '角色': '/console/roles', '权限': '/console/roles',
    '设置': '/console/settings', '配置': '/console/settings', '系统': '/console/settings',
    '日志': '/console/logs', '审计': '/console/logs',
    '明信片': '/console/postcard', 'postcard': '/console/postcard',
    '数字人': '/console/avatar', '形象': '/console/avatar', 'avatar': '/console/avatar',
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const term = searchTerm.trim().toLowerCase()
    for (const [key, path] of Object.entries(searchJump)) {
      if (term.includes(key.toLowerCase())) {
        router.push(path)
        setSearchTerm('')
        return
      }
    }
  }
  const menuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      document.documentElement.requestFullscreen().catch(() => {})
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-card/80 px-4 backdrop-blur-md lg:px-6">
      {/* Left: menu + breadcrumb */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="切换菜单"
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary"
        >
          <Menu className="size-5" />
        </button>
        <nav className="flex min-w-0 items-center gap-1.5 text-sm">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground/60" />}
              <span
                className={cn(
                  'truncate',
                  i === crumbs.length - 1
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {c}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2 md:flex">
          <Search className="size-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="输入关键词回车跳转，如「大屏」「知识」「用户」…"
            className="w-44 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground lg:w-56"
          />
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label="通知"
            className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary"
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-11 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-[0_16px_40px_rgb(80,120,200,0.18)]">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-semibold text-foreground">通知</span>
                {unreadCount > 0 && (
                  <button type="button" onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">全部已读</button>
                )}
              </div>
              <ul className="max-h-72 overflow-y-auto py-1">
                {notifs.length === 0 ? (
                  <li className="px-4 py-6 text-center text-sm text-muted-foreground">暂无通知</li>
                ) : notifs.map((n, i) => (
                  <li
                    key={n.id || `dyn-${i}`}
                    onClick={() => { if (n.link) { router.push(n.link); setNotifOpen(false) } }}
                    className={cn(
                      'flex cursor-pointer flex-col gap-0.5 px-4 py-2.5 transition-colors hover:bg-secondary',
                      !n.is_read && 'bg-primary/5 border-l-2 border-primary',
                    )}
                  >
                    <span className={cn('text-sm', n.is_read ? 'text-muted-foreground' : 'font-medium text-foreground')}>
                      {!n.is_read && <span className="inline-block size-1.5 rounded-full bg-primary mr-1.5 align-middle" />}
                      {n.title}
                    </span>
                    <span className="text-xs text-muted-foreground ml-3.5">{n.subtitle}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Fullscreen */}
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label="全屏"
          className="hidden size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary sm:flex"
        >
          {fullscreen ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
        </button>

        {/* Profile */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-secondary"
          >
            <img
              src="/avatar.png"
              alt="管理员头像"
              className="size-8 rounded-full object-cover"
            />
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-medium text-foreground">管理员</span>
              <span className="block text-[11px] text-muted-foreground">admin</span>
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 w-44 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-[0_16px_40px_rgb(80,120,200,0.18)]">
              {[
                { icon: User, label: '个人中心' },
                { icon: Settings, label: '账号设置' },
              ].map((m) => (
                <button
                  key={m.label}
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                >
                  <m.icon className="size-4 text-muted-foreground" />
                  {m.label}
                </button>
              ))}
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('token')
                  localStorage.removeItem('user')
                  window.location.href = '/login'
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-50"
              >
                <LogOut className="size-4" />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
