'use client'

import { useState, useEffect } from 'react'
import { Sun, Cloud, CloudRain, ChevronDown, Bell, UserCircle, LogOut, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { ProfileEditor } from '@/components/profile-editor'
import { deleteAccount } from '@/lib/auth-api'

function getWeatherIcon(weather: string) {
  if (weather.includes('雨')) return <CloudRain className="size-5 text-sky-500" />
  if (weather.includes('云') || weather.includes('阴')) return <Cloud className="size-5 text-sky-400" />
  return <Sun className="size-5 text-amber-400" />
}

export function TopHeader() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const [weekday, setWeekday] = useState('')
  const [weather, setWeather] = useState({ temp: '24', desc: '多云' })
  const [userName, setUserName] = useState('游客')
  const [profileOpen, setProfileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showTip, setShowTip] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePwd, setDeletePwd] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  // 读取用户信息
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const user = JSON.parse(stored)
        setUserName(user.nickname || '游客')
      }
      if (localStorage.getItem('showProfileTip') === '1') {
        setShowTip(true)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    function tick() {
      const now = new Date()
      setTime(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
      setDate(`${now.getMonth() + 1}月${now.getDate()}日`)
      setWeekday(['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()])
    }
    tick()
    const timer = setInterval(tick, 10000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/service/weather?city=320200`)
      .then(r => r.json())
      .then(d => {
        if (d.temperature) setWeather({ temp: d.temperature, desc: d.weather || '多云' })
      })
      .catch(() => {})
  }, [])

  const handleUserClick = () => {
    setShowTip(false)
    localStorage.removeItem('showProfileTip')
    setMenuOpen((v) => !v)
  }

  const handleProfile = () => {
    setMenuOpen(false)
    setProfileOpen(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('showProfileTip')
    setMenuOpen(false)
    window.location.href = '/login'
  }

  const handleDeleteAccount = async () => {
    if (!deletePwd) return
    setDeleteLoading(true)
    try {
      const stored = localStorage.getItem('user')
      const user = stored ? JSON.parse(stored) : null
      await deleteAccount(user?.id, deletePwd)
      localStorage.clear()
      setDeleteOpen(false)
      window.location.href = '/login'
    } catch {
      alert('注销失败，请检查密码是否正确')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      <header className="relative flex flex-wrap items-center justify-between gap-4 bg-gradient-to-b from-sky-200/90 via-sky-100/60 to-transparent px-6 py-4 lg:px-10">
        <div className="flex items-center gap-3">
          <img src="/logo-mark.png" alt="灵境云游" className="h-10" />
          <div className="leading-tight">
            <h1 className="text-xl font-bold text-foreground">灵境云游</h1>
            <p className="text-xs tracking-wide text-muted-foreground">智慧景区服务平台</p>
          </div>
        </div>

        <div className="flex items-center gap-5 text-sm">
          <div className="hidden items-center gap-2 sm:flex">
            {getWeatherIcon(weather.desc)}
            <span className="text-lg font-semibold text-foreground">{weather.temp}°C</span>
            <span className="text-muted-foreground">{weather.desc}</span>
          </div>
          <div className="hidden items-center gap-4 text-muted-foreground md:flex">
            <span className="h-4 w-px bg-border" />
            <span>{date}</span>
            <span>{weekday}</span>
            <span className="h-4 w-px bg-border" />
            <span className="font-medium text-foreground">{time}</span>
          </div>
          {/* 用户头像胶囊 + 下拉菜单 */}
          <div className="relative">
            <button
              onClick={handleUserClick}
              className="relative flex items-center gap-2 rounded-full border border-white/60 bg-card/70 py-1 pr-2 pl-1 shadow-[0_6px_20px_rgb(80,120,200,0.10)] backdrop-blur-md transition-all hover:shadow-[0_6px_20px_rgb(80,120,200,0.20)] hover:bg-card/85"
            >
              <img src="/avatar.png" alt="头像" className="size-8 rounded-full object-cover" />
              <span className="text-sm font-medium text-foreground">{userName}</span>
              <ChevronDown className="size-4 text-muted-foreground" />
              {showTip && (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-rose-500">
                  <Bell className="size-2.5 text-white" />
                </span>
              )}
            </button>

            {/* 下拉菜单 */}
            {menuOpen && (
              <div
                className="absolute right-0 top-12 z-30 w-44 overflow-hidden rounded-2xl border border-white/60 bg-card/90 backdrop-blur-xl py-1 shadow-[0_16px_40px_rgb(80,120,200,0.18)]"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  onClick={handleProfile}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/50"
                >
                  <UserCircle className="size-4 text-primary" />
                  个人信息
                </button>
                <div className="my-0.5 h-px bg-border/60 mx-3" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-rose-500 transition-colors hover:bg-rose-50/50"
                >
                  <LogOut className="size-4" />
                  退出登录
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setDeleteOpen(true) }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/50"
                >
                  <Trash2 className="size-4" />
                  注销账号
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 完善信息提示条 */}
      {showTip && (
        <div className="mx-6 mt-2 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/80 backdrop-blur-md px-4 py-2.5 text-sm shadow-[0_4px_12px_rgb(200,160,80,0.10)] lg:mx-10">
          <span className="flex items-center gap-2 text-amber-700">
            <Bell className="size-4" />
            建议完善个人信息，获得更精准的导览推荐和个性化路线
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowTip(false); localStorage.removeItem('showProfileTip'); setProfileOpen(true) }} className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-200">
              去完善
            </button>
            <button onClick={() => { setShowTip(false); localStorage.removeItem('showProfileTip') }} className="text-xs text-muted-foreground hover:text-foreground">
              忽略
            </button>
          </div>
        </div>
      )}

      {/* 个人信息编辑弹窗 */}
      <ProfileEditor open={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* 注销账号确认弹窗 */}
      {deleteOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4" onClick={() => setDeleteOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground">注销账号</h3>
                <p className="text-sm text-muted-foreground">此操作不可撤销，请输入密码确认</p>
              </div>
            </div>
            <input
              type="password"
              value={deletePwd}
              onChange={(e) => setDeletePwd(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDeleteAccount()}
              placeholder="输入密码以确认注销"
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-rose-400"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setDeleteOpen(false); setDeletePwd('') }}
                disabled={deleteLoading}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || !deletePwd}
                className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50"
              >
                {deleteLoading && <Loader2 className="size-4 animate-spin" />}
                确认注销
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
