'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Pencil, Trash2, Mic, Languages, MonitorPlay, X, Loader2, CheckCircle2, AlertTriangle, Upload } from 'lucide-react'
import { getDigitalHumans, createDigitalHuman, updateDigitalHuman, deleteDigitalHuman } from '@/lib/admin-api'
import type { DigitalHumanItem } from '@/lib/admin-api'
import { PageHeader, Panel } from '@/components/admin/admin-ui'
import { cn } from '@/lib/utils'

const TABS = ['全部', '使用中', '已停用'] as const
const SCENE_OPTIONS = ['首页导览', '景点讲解', '智能问答', '路线推荐', '便民服务']
const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

export default function AvatarPage() {
  const [list, setList] = useState<DigitalHumanItem[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<string>('全部')
  const [keyword, setKeyword] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const showToast = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(null), 2000) }, [])

  // 弹窗
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DigitalHumanItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DigitalHumanItem | null>(null)
  // 图片上传
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API_BASE}/api/digital-human/upload-avatar`, { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) {
        setPreviewUrl(data.url)
        // 写入 image_url 隐藏域
        const hidden = document.querySelector<HTMLInputElement>('input[name="image_url"]')
        if (hidden) hidden.value = data.url
        showToast('照片已上传')
      }
    } catch { showToast('上传失败') }
    finally { setUploading(false) }
  }

  const fetchList = useCallback(() => {
    setLoading(true)
    const params: any = { page: 1, page_size: 50 }
    if (tab === '使用中') params.is_active = true
    else if (tab === '已停用') params.is_active = false
    getDigitalHumans(params)
      .then((d) => setList(d.items || []))
      .catch(() => showToast('获取失败'))
      .finally(() => setLoading(false))
  }, [tab])

  useEffect(() => { fetchList() }, [fetchList])

  // 筛选
  const filtered = keyword
    ? list.filter((a) => a.name.includes(keyword) || (a.avatar_style || '').includes(keyword))
    : list

  // 统计
  const active = list.filter((a) => a.is_active).length
  const inactive = list.length - active

  // CRUD
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = (fd.get('name') as string || '').trim()
    if (!name) { showToast('请输入名称'); return }

    const scenes = SCENE_OPTIONS.filter((s) => fd.get(`scene_${s}`))
    const data = {
      name,
      avatar_style: (fd.get('avatar_style') as string || '').trim(),
      voice_name: (fd.get('voice_name') as string || '').trim(),
      avatar_id: (fd.get('avatar_id') as string || '').trim(),
      vcn: (fd.get('vcn') as string || '').trim(),
      gender: (fd.get('gender') as string || '').trim(),
      image_url: (fd.get('image_url') as string || '').trim(),
      scenes: JSON.stringify(scenes),
      greeting_text: (fd.get('greeting_text') as string || '').trim(),
      is_active: editTarget?.is_active ?? false,
    }

    try {
      if (editTarget) {
        await updateDigitalHuman(editTarget.id, data)
        showToast('形象已更新')
      } else {
        await createDigitalHuman(data)
        showToast('形象已添加')
      }
      setFormOpen(false); setEditTarget(null)
      fetchList()
    } catch { showToast('保存失败') }
  }

  const handleToggle = async (item: DigitalHumanItem) => {
    try {
      await updateDigitalHuman(item.id, { is_active: !item.is_active })
      showToast(item.is_active ? '已停用' : '已启用')
      fetchList()
    } catch { showToast('操作失败') }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteDigitalHuman(deleteTarget.id)
      showToast('已删除')
      setDeleteTarget(null)
      fetchList()
    } catch { showToast('删除失败') }
  }

  return (
    <div>
      <PageHeader
        title="数字人形象管理"
        desc="管理讯飞数字人形象配置。启用后游客端自动加载对应形象和音色，同时仅一个形象生效。"
        actions={
          <button type="button" onClick={() => { setEditTarget(null); setFormOpen(true); setPreviewUrl('') }}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus className="size-4" />新增形象
          </button>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: '形象总数', value: list.length, color: 'text-blue-500' },
          { label: '使用中', value: active, color: 'text-emerald-500' },
          { label: '已停用', value: inactive, color: 'text-slate-500' },
          { label: '独立音色', value: [...new Set(list.map(a => a.voice_name).filter(Boolean))].length, color: 'text-violet-500' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-[0_4px_14px_rgb(80,120,200,0.05)]">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={cn('mt-2 text-2xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <Panel className="mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
            {TABS.map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{t}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索名称或风格..." className="w-48 bg-transparent text-sm outline-none" />
          </div>
        </div>

        {loading && list.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground"><Loader2 className="inline-block size-5 animate-spin mr-2" />加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">暂无形象配置</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a) => {
              const scenes = (() => { try { return JSON.parse(a.scenes || '[]') } catch { return [] } })()
              return (
                <div key={a.id} className="flex gap-4 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-[0_8px_24px_rgb(80,120,200,0.12)]">
                  <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    <img src={a.image_url || '/placeholder.svg'} alt={a.name} className="size-full object-cover object-top" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-base font-semibold">{a.name}</p>
                      <span className={cn('shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium',
                        a.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-border bg-secondary text-muted-foreground')}>
                        {a.is_active ? '使用中' : '已停用'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{a.avatar_style}{a.gender ? ` · ${a.gender}` : ''}</p>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5"><Mic className="size-3.5 shrink-0" />{a.voice_name || '未设置'}</p>
                      <p className="flex items-center gap-1.5"><MonitorPlay className="size-3.5 shrink-0" />AVATAR: {a.avatar_id || '-'} / VCN: {a.vcn || '-'}</p>
                    </div>
                    {scenes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {scenes.map((sc: string) => (
                          <span key={sc} className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px]">{sc}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
                      <button type="button" onClick={() => { setEditTarget(a); setFormOpen(true); setPreviewUrl('') }}
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:opacity-70">
                        <Pencil className="size-3.5" />编辑
                      </button>
                      <button type="button" onClick={() => handleToggle(a)}
                        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                        {a.is_active ? '停用' : '启用'}
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(a)}
                        className="ml-auto flex items-center gap-1 text-xs font-medium text-rose-500 hover:opacity-70">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      {/* 新增/编辑弹窗 */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setFormOpen(false)}>
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editTarget ? '编辑形象' : '新增形象'}</h3>
              <button onClick={() => setFormOpen(false)} className="flex size-8 items-center justify-center rounded-lg hover:bg-secondary"><X className="size-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              {/* 行1：名称 + 风格 */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">名称 <span className="text-rose-500">*</span></span>
                  <input name="name" defaultValue={editTarget?.name || ''} required className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">风格</span>
                  <input name="avatar_style" defaultValue={editTarget?.avatar_style || ''} placeholder="古风少女" className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary" />
                </label>
              </div>

              {/* 行2：形象照上传（独立一行） */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">形象照</span>
                <div className="flex items-center gap-3">
                  {(previewUrl || editTarget?.image_url) && (
                    <img src={previewUrl || editTarget?.image_url} alt="预览" className="size-20 shrink-0 rounded-xl object-cover object-top border" />
                  )}
                  <div className="flex-1 space-y-2">
                    <input name="image_url" defaultValue={editTarget?.image_url || ''} placeholder="图片URL（上传后自动填充）" className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary" />
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2 text-sm hover:bg-accent">
                      <Upload className="size-4" />{uploading ? '上传中...' : '上传照片'}
                      <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              {/* 行3：性别 + 音色标签 */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">性别</span>
                  <select name="gender" defaultValue={editTarget?.gender || ''} className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary">
                    <option value="">--</option><option value="女">女</option><option value="男">男</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">音色标签</span>
                  <input name="voice_name" defaultValue={editTarget?.voice_name || ''} placeholder="舒窈·女声" className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary" />
                </label>
              </div>

              {/* 行4：讯飞参数 */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">讯飞 Avatar ID</span>
                  <input name="avatar_id" defaultValue={editTarget?.avatar_id || ''} placeholder="111322001" className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">讯飞 VCN</span>
                  <input name="vcn" defaultValue={editTarget?.vcn || ''} placeholder="x4_lingxiaoyu_assist" className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary" />
                </label>
              </div>

              {/* 行5：欢迎语 */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">欢迎语</span>
                <input name="greeting_text" defaultValue={editTarget?.greeting_text || ''} placeholder="您好，我是您的AI导览员..." className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary" />
              </label>

              {/* 行6：适用场景 */}
              <fieldset>
                <legend className="text-sm font-medium mb-1">适用场景</legend>
                <div className="flex flex-wrap gap-2">
                  {SCENE_OPTIONS.map((sc) => {
                    let checked = false
                    if (editTarget) {
                      try { checked = JSON.parse(editTarget.scenes || '[]').includes(sc) } catch {}
                    }
                    return (
                      <label key={sc} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" name={`scene_${sc}`} defaultChecked={checked} className="size-4 accent-primary" />{sc}
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border px-4 py-2 text-sm hover:bg-secondary">取消</button>
                <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">{editTarget ? '保存' : '添加'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500"><AlertTriangle className="size-5" /></span>
              <div><h3 className="font-semibold">确认删除</h3><p className="text-sm text-muted-foreground">删除「{deleteTarget.name}」？</p></div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="rounded-xl border px-4 py-2 text-sm hover:bg-secondary">取消</button>
              <button onClick={handleDelete} className="rounded-xl bg-rose-500 px-4 py-2 text-sm text-white hover:bg-rose-600">确认删除</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-400" />{toast}
        </div>
      )}
    </div>
  )
}
