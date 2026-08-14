'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, LogIn, UserPlus, ArrowLeft } from 'lucide-react'
import { loginTourist, loginAdmin, registerAdmin } from '@/lib/auth-api'
import { cn } from '@/lib/utils'

type Mode = 'tourist' | 'admin'

// ============================================================
export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('tourist')
  const [isRegister, setIsRegister] = useState(false)

  const [phone, setPhone] = useState('')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setPhone('')
    setAccount('')
    setPassword('')
    setInviteCode('')
    setError(null)
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    resetForm()
    setIsRegister(false)
  }

  const toggleRegister = () => {
    setIsRegister((v) => !v)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'tourist') {
      if (!phone.trim() || !password.trim()) {
        setError('请输入手机号和密码')
        return
      }
      if (password.length < 6) {
        setError('密码至少 6 位')
        return
      }
      setLoading(true)
      try {
        const r = await loginTourist(phone.trim(), password)
        localStorage.setItem('token', r.token)
        localStorage.setItem('user', JSON.stringify(r.user))
        // 新用户或无画像信息，跳转后提示完善
        if (!r.user.nickname || r.user.nickname.startsWith('游客')) {
          localStorage.setItem('showProfileTip', '1')
        }
        router.push('/')
      } catch (err: any) {
        setError(err.message || '登录失败')
      } finally {
        setLoading(false)
      }
    } else {
      if (!account.trim() || !password.trim()) {
        setError('请输入账号和密码')
        return
      }
      if (isRegister) {
        if (!inviteCode.trim()) {
          setError('请输入邀请码')
          return
        }
        if (account.length < 3) {
          setError('账号至少 3 位')
          return
        }
        if (password.length < 6) {
          setError('密码至少 6 位')
          return
        }
        setLoading(true)
        try {
          const r = await registerAdmin(account.trim(), password, inviteCode.trim())
          localStorage.setItem('token', r.token)
          localStorage.setItem('user', JSON.stringify(r.user))
          router.push('/console')
        } catch (err: any) {
          setError(err.message || '注册失败')
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(true)
        try {
          const r = await loginAdmin(account.trim(), password)
          localStorage.setItem('token', r.token)
          localStorage.setItem('user', JSON.stringify(r.user))
          router.push('/console')
        } catch (err: any) {
          setError(err.message || '登录失败')
        } finally {
          setLoading(false)
        }
      }
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* ===== 背景层 ===== */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-oklch(0.93 0.04 235)" />
      <div
        className="absolute inset-0 bg-cover bg-center opacity-85"
        style={{ backgroundImage: 'url(/背景底图.jpg)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100/40 via-background/50 to-background/80" />

      {/* ===== 登录卡片 ===== */}
      <div className="relative z-10 w-full max-w-md">
        {/* 品牌区 */}
        <div className="mb-6 text-center">
          <img src="/灵境云游_logo_透明底_裁切版.png" alt="灵境云游" className="mx-auto h-32 drop-shadow-[0_4px_12px_rgb(56,132,222,0.2)]" />
        </div>

        {/* 主卡片 */}
        <div className="rounded-3xl border border-white/60 bg-card/45 backdrop-blur-md p-6 shadow-[0_16px_50px_rgb(80,120,200,0.10)]">
          {/* 模式切换 */}
          <div className="flex rounded-xl bg-secondary p-1 mb-6">
            <button
              type="button"
              onClick={() => switchMode('tourist')}
              className={cn(
                'flex-1 rounded-lg py-2.5 text-sm font-medium transition-all',
                mode === 'tourist'
                  ? 'bg-card text-foreground shadow-[0_4px_12px_rgb(80,120,200,0.15)]'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              🧑 游客登录
            </button>
            <button
              type="button"
              onClick={() => switchMode('admin')}
              className={cn(
                'flex-1 rounded-lg py-2.5 text-sm font-medium transition-all',
                mode === 'admin'
                  ? 'bg-card text-foreground shadow-[0_4px_12px_rgb(80,120,200,0.15)]'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              👨‍💼 管理员登录
            </button>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'tourist' ? (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">手机号 <span className="text-rose-500">*</span></span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="请输入手机号"
                    maxLength={11}
                    className="rounded-xl border border-border bg-white/80 px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">密码 <span className="text-rose-500">*</span></span>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="设置登录密码（至少6位）"
                      className="w-full rounded-xl border border-border bg-white/80 px-4 py-2.5 pr-10 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </label>
                <p className="text-xs text-muted-foreground -mt-2 text-center">
                  首次使用将自动注册，手机号即为您的账号
                </p>
              </>
            ) : isRegister ? (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">账号</span>
                  <input
                    type="text"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder="请设置登录账号（至少3位）"
                    className="rounded-xl border border-border bg-white/80 px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">密码</span>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请设置密码（至少6位）"
                      className="w-full rounded-xl border border-border bg-white/80 px-4 py-2.5 pr-10 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">邀请码</span>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="请输入管理员邀请码"
                    className="rounded-xl border border-border bg-white/80 px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">账号</span>
                  <input
                    type="text"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder="请输入管理员账号"
                    className="rounded-xl border border-border bg-white/80 px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">密码</span>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入密码"
                      className="w-full rounded-xl border border-border bg-white/80 px-4 py-2.5 pr-10 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </label>
              </>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-600">
                {error}
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-[0_6px_16px_rgb(80,120,200,0.28)] transition-all hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isRegister ? (
                <UserPlus className="size-4" />
              ) : (
                <LogIn className="size-4" />
              )}
              {isRegister ? '注册管理员' : '登  录'}
            </button>
          </form>

          {/* 底部切换链接 */}
          <div className="mt-4 text-center">
            {mode === 'admin' ? (
              <button
                type="button"
                onClick={toggleRegister}
                className="text-sm text-primary transition-colors hover:underline"
              >
                {isRegister ? (
                  <span className="flex items-center justify-center gap-1">
                    <ArrowLeft className="size-3.5" />
                    返回管理员登录
                  </span>
                ) : (
                  '还没有管理员账号？立即注册 →'
                )}
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">
                输入手机号和密码即可登录，首次使用自动创建账户
              </p>
            )}
          </div>
        </div>

        {/* 底部版权 */}
        <p className="mt-6 text-center text-xs text-muted-foreground/70">
          © 灵境云游 · 智慧景区服务平台
        </p>
      </div>
    </div>
  )
}
