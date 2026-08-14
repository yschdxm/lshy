'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, CheckCircle2, User } from 'lucide-react'
import { updateProfile } from '@/lib/auth-api'
import { cn } from '@/lib/utils'

interface ProfileData {
  nickname: string
  gender: string
  age_group: string
  region: string
}

interface Props {
  open: boolean
  onClose: () => void
}

const PROVINCES = ['江苏','上海','浙江','安徽','广东','山东','北京','河南','福建','湖北','四川','湖南','河北','辽宁','重庆','江西','陕西','广西','云南','贵州','山西','黑龙江','吉林','甘肃','海南','宁夏','青海','西藏','新疆','内蒙古','天津','台湾','香港','澳门']

export function ProfileEditor({ open, onClose }: Props) {
  const [nickname, setNickname] = useState('')
  const [gender, setGender] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
  const [region, setRegion] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // 读取当前用户信息
  useEffect(() => {
    if (!open) return
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const u = JSON.parse(stored)
        setNickname(u.nickname && !u.nickname.startsWith('游客') ? u.nickname : '')
        setGender(u.gender || '')
        setAgeGroup(u.age_group || '')
        setRegion(u.region || '')
      }
    } catch { /* ignore */ }
  }, [open])

  // 显示 toast
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  // 保存到后端 + 同步 localStorage
  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateProfile({
        nickname: nickname.trim() || undefined,
        gender: gender || undefined,
        age_group: ageGroup || undefined,
        region: region || undefined,
      })
      // 同步到 localStorage
      if (result.user) {
        const stored = JSON.parse(localStorage.getItem('user') || '{}')
        Object.assign(stored, result.user)
        localStorage.setItem('user', JSON.stringify(stored))
      }
      localStorage.removeItem('showProfileTip')
      showToast('个人信息已保存')
      setTimeout(() => onClose(), 800)
    } catch (err: any) {
      showToast(err.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
        <div
          className="w-full max-w-sm rounded-3xl border border-white/60 bg-card/90 backdrop-blur-xl p-6 shadow-[0_16px_50px_rgb(80,120,200,0.12)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4C9BE8] to-[#2AB7B0] shadow-[0_4px_12px_rgb(56,132,222,0.3)]">
                <User className="size-5 text-white" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground">个人信息</h3>
                <p className="text-xs text-muted-foreground">完善后可获得更精准的导览推荐</p>
              </div>
            </div>
            <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
              <X className="size-4" />
            </button>
          </div>

          {/* 表单 */}
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-foreground">昵称</span>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="给自己起个名"
                maxLength={20}
                className="rounded-xl border border-border bg-white/80 px-3 py-2 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60 hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-foreground">性别</span>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="rounded-xl border border-border bg-white/80 px-3 py-2 text-sm text-foreground outline-none transition-all hover:border-primary/40 focus:border-primary"
                >
                  <option value="">请选择</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-foreground">年龄段</span>
                <select
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                  className="rounded-xl border border-border bg-white/80 px-3 py-2 text-sm text-foreground outline-none transition-all hover:border-primary/40 focus:border-primary"
                >
                  <option value="">请选择</option>
                  <option value="18岁以下">18 岁以下</option>
                  <option value="18-30岁">18-30 岁</option>
                  <option value="31-45岁">31-45 岁</option>
                  <option value="46-60岁">46-60 岁</option>
                  <option value="60岁以上">60 岁以上</option>
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-foreground">所在省份</span>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="rounded-xl border border-border bg-white/80 px-3 py-2 text-sm text-foreground outline-none transition-all hover:border-primary/40 focus:border-primary"
              >
                <option value="">请选择</option>
                {PROVINCES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              以后再说
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_4px_12px_rgb(80,120,200,0.28)] transition-all hover:opacity-90"
            >
              保存
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </>
  )
}
