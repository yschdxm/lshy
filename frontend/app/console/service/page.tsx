'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Pencil, Trash2, Clock, MapPin, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { getServices, createService, updateService, deleteService, type ServiceItem } from '@/lib/admin-api'
import { serviceTypeMeta, serviceStatusMeta, serviceFeatureMeta } from '@/lib/admin-data'
import { PageHeader, Panel, Pagination } from '@/components/admin/admin-ui'
import { cn } from '@/lib/utils'

const TABS = ['全部', '卫生间', '餐饮', '出口', '医务室', '游客中心', '停车点'] as const
const FEATURE_OPTIONS = ['无障碍', '母婴间', '急救', '轮椅租借', '咨询', '失物招领', '团餐预订', '充电桩', '大巴车位', '直饮水', '休息区']
const STATUS_OPTIONS = ['开放中', '维护中', '已关闭'] as const

export default function ServicePage() {
  const [list, setList] = useState<ServiceItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<string>('全部')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState<string | null>(null)
  const pageSize = 6

  // 弹窗
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ServiceItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null)

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2000) }

  const fetchData = useCallback(() => {
    setLoading(true)
    getServices({ page, page_size: pageSize, keyword, type: tab === '全部' ? '' : tab })
      .then(d => { setList(d.items); setTotal(d.total) })
      .catch(() => showToast('加载失败'))
      .finally(() => setLoading(false))
  }, [page, tab, keyword])

  useEffect(() => { fetchData() }, [fetchData])

  // CRUD
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteService(deleteTarget.id)
      showToast('设施已删除')
      setDeleteTarget(null)
      fetchData()
    } catch { showToast('删除失败') }
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = (fd.get('name') as string || '').trim()
    const type = (fd.get('type') as string || '卫生间')
    const location = (fd.get('location') as string || '').trim()
    const hours = (fd.get('hours') as string || '').trim()
    const status = (fd.get('status') as string || '开放中')
    const features = fd.getAll('features') as string[]

    if (!name) { showToast('请输入设施名称'); return }

    const data = { name, type, location, hours, status, features }
    try {
      if (editTarget) {
        await updateService(editTarget.id, data)
        showToast('设施已更新')
      } else {
        await createService(data)
        showToast('设施已添加')
      }
      setFormOpen(false); setEditTarget(null)
      fetchData()
    } catch { showToast('保存失败') }
  }

  // 统计
  const stats = {
    total: total,
    open: list.filter(s => s.status === '开放中').length,
    maintain: list.filter(s => s.status !== '开放中').length,
  }

  return (
    <div>
      <PageHeader
        title="便民服务管理"
        desc="管理景区卫生间、餐饮、医务室等便民服务设施的位置、开放状态。修改后游客端实时生效。"
        actions={
          <button type="button" onClick={() => { setEditTarget(null); setFormOpen(true) }}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90">
            <Plus className="size-4" />新增设施
          </button>
        }
      />

      {/* 统计 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: '设施总数', value: stats.total, color: 'text-blue-500' },
          { label: '开放中', value: stats.open, color: 'text-emerald-500' },
          { label: '维护/关闭', value: stats.maintain, color: 'text-rose-500' },
          { label: '设施类型', value: '6 种', color: 'text-violet-500' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-[0_4px_14px_rgb(80,120,200,0.05)]">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={cn('mt-2 text-2xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <Panel className="mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-secondary p-1">
            {TABS.map((t) => (
              <button key={t} type="button" onClick={() => { setTab(t); setPage(1) }}
                className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
              placeholder="搜索设施名称或位置..."
              className="w-52 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-2 py-3 font-medium">设施</th>
                <th className="px-2 py-3 font-medium">类型</th>
                <th className="px-2 py-3 font-medium">特色</th>
                <th className="px-2 py-3 font-medium">开放时间</th>
                <th className="px-2 py-3 font-medium">状态</th>
                <th className="px-2 py-3 font-medium">更新时间</th>
                <th className="px-2 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-muted-foreground"><Loader2 className="inline-block size-5 animate-spin mr-2" />加载中...</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">暂无匹配的服务设施</td></tr>
              ) : (
                list.map((s) => {
                  const meta = serviceTypeMeta[s.type as keyof typeof serviceTypeMeta]
                  const TypeIcon = meta?.icon
                  return (
                    <tr key={s.id} className="border-b border-border/70 text-sm transition-colors hover:bg-secondary/40">
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-3">
                          <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', meta?.tint || 'bg-secondary')}>
                            {TypeIcon && <TypeIcon className="size-5" />}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{s.name}</p>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="size-3" />{s.location}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{s.type}</span>
                      </td>
                      <td className="px-2 py-3">
                        {s.features?.length ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {s.features.map((ft: string) => {
                              const FIcon = serviceFeatureMeta[ft as keyof typeof serviceFeatureMeta]
                              return (
                                <span key={ft} className="flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                                  {FIcon && <FIcon className="size-3" />}{ft}
                                </span>
                              )
                            })}
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-muted-foreground text-xs">
                        <Clock className="size-3.5 inline mr-1" />{s.hours}
                      </td>
                      <td className="px-2 py-3">
                        <span className={cn('rounded-md border px-2 py-0.5 text-xs font-medium',
                          serviceStatusMeta[s.status as keyof typeof serviceStatusMeta] || '')}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-xs text-muted-foreground">{s.updated_at}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => { setEditTarget(s); setFormOpen(true) }}
                            className="rounded-md px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/5">
                            <Pencil className="size-3.5 inline mr-1" />编辑
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(s)}
                            className="rounded-md px-2 py-1 text-xs text-rose-500 transition-colors hover:bg-rose-50">
                            <Trash2 className="size-3.5 inline mr-1" />删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">共 {total} 条</span>
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} />
        </div>
      </Panel>

      {/* 新建/编辑弹窗 */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setFormOpen(false)}>
          <div className="w-full max-w-lg max-h-[85vh] rounded-2xl bg-card shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">{editTarget ? '编辑设施' : '新增设施'}</h3>
              <button onClick={() => setFormOpen(false)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"><X className="size-5" /></button>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">名称 <span className="text-rose-500">*</span></span>
                <input name="name" defaultValue={editTarget?.name || ''} required
                  className="rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-foreground">类型</span>
                  <select name="type" defaultValue={editTarget?.type || '卫生间'}
                    className="rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary">
                    {TABS.filter(t => t !== '全部').map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-foreground">状态</span>
                  <select name="status" defaultValue={editTarget?.status || '开放中'}
                    className="rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">位置</span>
                <input name="location" defaultValue={editTarget?.location || ''}
                  placeholder="例：梵宫东侧"
                  className="rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">开放时间</span>
                <input name="hours" defaultValue={editTarget?.hours || ''}
                  placeholder="例：08:00-18:00"
                  className="rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
              </label>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium text-foreground">特色功能</legend>
                <div className="flex flex-wrap gap-2">
                  {FEATURE_OPTIONS.map(f => (
                    <label key={f} className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" name="features" value={f} defaultChecked={editTarget?.features?.includes(f)}
                        className="size-4 rounded border-border accent-primary" />
                      {f}
                    </label>
                  ))}
                </div>
              </fieldset>
            </form>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <button type="button" onClick={() => setFormOpen(false)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">取消</button>
              <button type="button" onClick={() => { const f = document.querySelector('form'); if (f) f.requestSubmit() }}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                {editTarget ? '保存修改' : '添加设施'}
              </button>
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
              <div>
                <h3 className="text-base font-semibold text-foreground">确认删除</h3>
                <p className="text-sm text-muted-foreground">确定要删除「{deleteTarget.name}」吗？</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">取消</button>
              <button onClick={handleDelete} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600">确认删除</button>
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
