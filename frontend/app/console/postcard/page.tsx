'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Trash2, Heart, Download, Eye, X, Loader2, CheckCircle2, AlertTriangle, Landmark, Droplet, Stamp, Moon, Sparkles } from 'lucide-react'
import { getPostcardStats, getPostcardList, getPostcardStyles, togglePostcardStyle, type PostcardStats, type PostcardItem, type PostcardStyleItem } from '@/lib/admin-api'
import { postcardStyleTone } from '@/lib/admin-data'
import { PageHeader, Panel, Pagination } from '@/components/admin/admin-ui'
import { deletePostcardApi } from '@/lib/api'
import { cn } from '@/lib/utils'

const FILTER_TABS = ['全部', '国风插画', '清新水彩', '复古邮票', '夜景梦幻', '卡通治愈'] as const

const STYLE_ICON_MAP: Record<string, React.ElementType> = {
  guofeng: Landmark, watercolor: Droplet, vintage: Stamp, night: Moon, cartoon: Sparkles,
}

export default function PostcardPage() {
  const [stats, setStats] = useState<PostcardStats | null>(null)
  const [works, setWorks] = useState<PostcardItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [style, setStyle] = useState<string>('全部')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 9
  const [toast, setToast] = useState<string | null>(null)
  const showToast = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(null), 2000) }, [])

  // 风格模板状态（从 API 加载）
  const [styles, setStyles] = useState<PostcardStyleItem[]>([])
  useEffect(() => { getPostcardStyles().then(d => setStyles(d.styles)).catch(() => {}) }, [])

  // 弹窗
  const [preview, setPreview] = useState<PostcardItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PostcardItem | null>(null)

  // 获取统计
  useEffect(() => { getPostcardStats().then(setStats).catch(() => {}) }, [])

  // 获取作品
  const fetchWorks = useCallback(() => {
    setLoading(true)
    const params: any = { page, page_size: pageSize }
    if (style !== '全部') params.style = style
    getPostcardList(params)
      .then((d) => { setWorks(d.items || []); setTotal(d.total) })
      .catch(() => showToast('获取作品失败'))
      .finally(() => setLoading(false))
  }, [page, style])

  useEffect(() => { fetchWorks() }, [fetchWorks])

  // 删除
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deletePostcardApi(deleteTarget.id)
      showToast('作品已删除')
      setDeleteTarget(null)
      fetchWorks()
      getPostcardStats().then(setStats).catch(() => {})
    } catch { showToast('删除失败') }
  }

  // 风格开关（调用 API 持久化）
  const toggleStyle = async (key: string) => {
    try {
      const res = await togglePostcardStyle(key)
      setStyles(prev => prev.map(s => s.key === key ? { ...s, enabled: res.enabled } : s))
      showToast(res.enabled ? `「${STYLE_LABEL_MAP[key] || key}」已上线` : `「${STYLE_LABEL_MAP[key] || key}」已下线`)
    } catch { showToast('操作失败') }
  }

  const STYLE_LABEL_MAP: Record<string, string> = {
    guofeng: '国风插画', watercolor: '清新水彩', vintage: '复古邮票',
    night: '夜景梦幻', cartoon: '卡通治愈',
  }

  // 筛选
  const filtered = keyword
    ? works.filter((w) => w.title.includes(keyword) || w.spot_name.includes(keyword))
    : works

  return (
    <div>
      <PageHeader
        title="AI明信片管理"
        desc="管理明信片风格模板与游客作品。为保护隐私，游客个人信息不在此展示。"
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: '生成总量', value: stats ? String(stats.total) : '—', icon: Heart, tint: 'text-blue-500' },
          { label: '今日生成', value: stats ? String(stats.today) : '—', icon: Eye, tint: 'text-orange-500' },
          { label: '风格模板', value: styles.length + ' 种', icon: Download, tint: 'text-emerald-500' },
          { label: '上线模板', value: styles.filter(s => s.enabled).length + ' 种', icon: CheckCircle2, tint: 'text-teal-500' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-[0_4px_14px_rgb(80,120,200,0.05)]">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={cn('mt-2 text-2xl font-bold', s.tint)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        {/* 作品画廊 */}
        <Panel className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-secondary p-1">
              {FILTER_TABS.map((t) => (
                <button key={t} type="button" onClick={() => { setStyle(t); setPage(1) }}
                  className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    style === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <Search className="size-4 text-muted-foreground" />
              <input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
                placeholder="搜索作品或景点..." className="w-40 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading && works.length === 0 ? (
              <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
                <Loader2 className="inline-block size-5 animate-spin mr-2" />加载中...
              </div>
            ) : filtered.length === 0 ? (
              <div className="col-span-full py-12 text-center text-sm text-muted-foreground">暂无明信片作品</div>
            ) : (
              filtered.map((w) => (
                <div key={w.id} className="group overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-[0_8px_24px_rgb(80,120,200,0.12)]">
                  <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                    {w.image_data ? (
                      <img src={w.image_data.startsWith('data:') ? w.image_data : `/placeholder.svg`} alt={w.title}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground text-sm">
                        {w.spot_name || w.style}
                      </div>
                    )}
                    <span className={cn('absolute right-2 top-2 rounded-md border px-2 py-0.5 text-xs font-medium backdrop-blur',
                      postcardStyleTone[w.style] || 'text-slate-600 bg-slate-50')}>
                      {w.style}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="truncate font-medium text-foreground">{w.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{w.spot_name || '灵山胜境'}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{w.created_at ? new Date(w.created_at).toLocaleDateString('zh-CN') : ''}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                      <button type="button" onClick={() => setPreview(w)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-secondary py-1.5 text-xs font-medium hover:bg-accent">
                        <Eye className="size-3.5" />预览
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(w)}
                        className="flex items-center justify-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-100">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">共 {total} 件</span>
            <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} />
          </div>
        </Panel>

        {/* 风格模板 */}
        <Panel title="风格模板" className="p-4">
          <div className="space-y-3">
            {styles.map((st) => {
              const Icon = STYLE_ICON_MAP[st.key] || Sparkles
              return (
              <div key={st.key} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
                <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-lg', postcardStyleTone[st.label] || 'bg-secondary')}>
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{st.label}</p>
                  <p className="text-xs text-muted-foreground">使用 {st.usage} 次</p>
                </div>
                <button type="button" onClick={() => toggleStyle(st.key)}
                  className={cn('shrink-0 rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                    st.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-border bg-secondary text-muted-foreground')}>
                  {st.enabled ? '已上线' : '已下线'}
                </button>
              </div>
              )
            })}
          </div>
        </Panel>
      </div>

      {/* 预览弹窗 */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreview(null)}>
          <div className="max-h-[85vh] max-w-lg rounded-2xl bg-card shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">{preview.title}</h3>
              <button onClick={() => setPreview(null)} className="flex size-8 items-center justify-center rounded-lg hover:bg-secondary"><X className="size-4" /></button>
            </div>
            <div className="p-4">
              {preview.image_data ? (
                <img src={preview.image_data.startsWith('data:') ? preview.image_data : '/placeholder.svg'} alt={preview.title}
                  className="w-full rounded-xl object-cover" style={{ maxHeight: '60vh' }} />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                  {preview.spot_name} · {preview.style}
                </div>
              )}
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span>景点：{preview.spot_name || '—'}</span>
                <span>风格：{preview.style}</span>
                <span>时间：{preview.created_at ? new Date(preview.created_at).toLocaleString('zh-CN') : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500"><AlertTriangle className="size-5" /></span>
              <div><h3 className="font-semibold">确认删除</h3><p className="text-sm text-muted-foreground">删除「{deleteTarget.title}」？</p></div>
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
