'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, Plus, Eye, ChevronDown, Pencil, Trash2, X, Loader2,
  AlertTriangle, CheckCircle2,
} from 'lucide-react'
import {
  getFaqStats, getFaqs, createFaq, updateFaq, deleteFaq, incrementFaqView,
  getKnowledgeStats,
} from '@/lib/admin-api'
import type { FaqStats, FaqItem, FaqList } from '@/lib/admin-api'
import { PageHeader, Panel, Pagination } from '@/components/admin/admin-ui'
import { cn } from '@/lib/utils'
import { categoryToneMeta } from '@/lib/admin-data'

const TABS = ['全部', '已发布', '草稿', '待完善'] as const

const statusStyleMap: Record<string, string> = {
  '已发布': 'text-emerald-600 bg-emerald-50 border-emerald-200',
  '草稿': 'text-amber-600 bg-amber-50 border-amber-200',
  '待完善': 'text-rose-600 bg-rose-50 border-rose-200',
}

function getStatusStyle(status: string): string {
  return statusStyleMap[status] || 'text-slate-600 bg-slate-50 border-slate-200'
}

// ============================================================
export default function FaqPage() {
  // 数据
  const [items, setItems] = useState<FaqItem[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<FaqStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 筛选
  const [tab, setTab] = useState<string>('全部')
  const [category, setCategory] = useState('全部分类')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // 分类列表
  const [categoryOptions, setCategoryOptions] = useState<string[]>(['全部分类'])

  // 展开
  const [expanded, setExpanded] = useState<number | null>(null)

  // 弹窗
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<FaqItem | null>(null)
  const [formSaving, setFormSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FaqItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Toast
  const [toast, setToast] = useState<string | null>(null)
  const showToast = useCallback((m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 2500)
  }, [])

  // ==================== 数据获取 ====================

  const fetchItems = useCallback(() => {
    setLoading(true)
    setError(null)
    const params: any = { page, page_size: pageSize }
    if (tab !== '全部') params.status = tab
    if (category !== '全部分类') params.category = category
    if (keyword) params.keyword = keyword

    getFaqs(params)
      .then((d) => {
        setItems(d.items || [])
        setTotal(d.total)
      })
      .catch((err) => {
        console.error('获取 FAQ 失败:', err)
        setError('无法连接后端服务')
      })
      .finally(() => setLoading(false))
  }, [page, tab, category, keyword])

  const fetchStats = useCallback(() => {
    getFaqStats().then(setStats).catch(() => {})
  }, [])

  const fetchCategories = useCallback(() => {
    getKnowledgeStats()
      .then((s) => {
        if (s?.categories?.length) {
          setCategoryOptions(['全部分类', ...s.categories.map((c) => c.name)])
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])
  useEffect(() => { fetchStats(); fetchCategories() }, [fetchStats, fetchCategories])

  // ==================== 操作 ====================

  const handleExpand = async (id: number) => {
    if (expanded === id) {
      setExpanded(null)
      return
    }
    setExpanded(id)
    // 增加浏览量
    try {
      await incrementFaqView(id)
      setItems((prev) => prev.map((f) => f.id === id ? { ...f, views: (f.views || 0) + 1 } : f))
      fetchStats()
    } catch { /* 非关键 */ }
  }

  const handleCreate = () => {
    setEditItem(null)
    setFormOpen(true)
  }

  const handleEdit = (item: FaqItem) => {
    setEditItem(item)
    setFormOpen(true)
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const data = {
      question: (formData.get('question') as string) || '',
      answer: (formData.get('answer') as string) || '',
      category: (formData.get('category') as string) || '通用',
      status: (formData.get('status') as string) || '已发布',
    }
    if (!data.question.trim()) {
      showToast('请输入问题')
      return
    }
    setFormSaving(true)
    try {
      if (editItem) {
        await updateFaq(editItem.id, data)
        showToast('FAQ 已更新')
      } else {
        await createFaq(data)
        showToast('FAQ 已创建')
      }
      setFormOpen(false)
      setEditItem(null)
      fetchItems()
      fetchStats()
    } catch {
      showToast('保存失败')
    } finally {
      setFormSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteFaq(deleteTarget.id)
      showToast(`已删除「${deleteTarget.question.slice(0, 20)}…」`)
      setDeleteTarget(null)
      fetchItems()
      fetchStats()
    } catch {
      showToast('删除失败')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ==================== 渲染 ====================

  const statCards = stats
    ? [
        { label: 'FAQ 总数', value: String(stats.total), color: 'text-blue-500' },
        { label: '已发布', value: String(stats.published), color: 'text-emerald-500' },
        { label: '总浏览量', value: stats.total_views > 999 ? `${(stats.total_views / 1000).toFixed(1)}K` : String(stats.total_views), color: 'text-orange-500' },
        { label: '待完善', value: String(stats.draft), color: 'text-rose-500' },
      ]
    : []

  return (
    <div>
      <PageHeader
        title="FAQ 管理"
        desc="维护游客常见问题与标准答案，支持分类、状态管理与浏览统计，为 AI 问答提供高质量语料。"
        actions={
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            <Plus className="size-4" />
            新建 FAQ
          </button>
        }
      />

      {/* 统计卡片 */}
      {statCards.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={cn('mt-2 text-2xl font-bold', s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 错误 */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 主面板 */}
      <Panel className="mt-4 p-4">
        {/* 工具栏 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setPage(1) }}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  tab === t
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1) }}
                className="appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-8 text-sm text-foreground outline-none"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={keyword}
                onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
                placeholder="搜索问题或答案..."
                className="w-40 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* FAQ 列表 */}
        <div className="mt-3 space-y-2">
          {loading && items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Loader2 className="inline-block size-5 animate-spin mr-2" />
              加载中...
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              暂无匹配的 FAQ 条目
            </div>
          ) : (
            items.map((f) => {
              const open = expanded === f.id
              const catTone = categoryToneMeta[f.category] || 'text-slate-600 bg-slate-50'
              const stTone = getStatusStyle(f.status)
              return (
                <div
                  key={f.id}
                  className="rounded-xl border border-border transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start gap-3 p-3">
                    <button
                      type="button"
                      onClick={() => handleExpand(f.id)}
                      className="flex flex-1 items-start gap-3 text-left"
                    >
                      <ChevronDown
                        className={cn(
                          'mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform',
                          open && 'rotate-180',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{f.question}</span>
                          <span className={cn('rounded-md px-1.5 py-0.5 text-xs font-medium', catTone)}>
                            {f.category}
                          </span>
                          <span className={cn('rounded-md border px-1.5 py-0.5 text-xs font-medium', stTone)}>
                            {f.status}
                          </span>
                        </div>
                        {!open && (
                          <p className="mt-1 truncate text-sm text-muted-foreground">{f.answer}</p>
                        )}
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-3 pt-0.5 text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="size-3.5" />
                        {f.views.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEdit(f)}
                        className="flex items-center gap-1 text-primary hover:opacity-70"
                      >
                        <Pencil className="size-3.5" />
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(f)}
                        className="flex items-center gap-1 text-rose-500 hover:opacity-70"
                      >
                        <Trash2 className="size-3.5" />
                        删除
                      </button>
                    </div>
                  </div>
                  {open && (
                    <div className="border-t border-border/70 px-3 pb-3 pl-10 pt-3">
                      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{f.answer}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        更新时间：{f.updated_at ? new Date(f.updated_at).toLocaleString('zh-CN') : '—'}
                      </p>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* 分页 */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">共 {total} 条</span>
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} />
        </div>
      </Panel>

      {/* ===== 新建/编辑弹窗 ===== */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setFormOpen(false)}>
          <div className="w-full max-w-xl max-h-[85vh] rounded-2xl bg-card shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                {editItem ? '编辑 FAQ' : '新建 FAQ'}
              </h3>
              <button type="button" onClick={() => setFormOpen(false)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">问题 <span className="text-rose-500">*</span></span>
                <input
                  name="question"
                  defaultValue={editItem?.question || ''}
                  required
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                  placeholder="例：灵山大佛有多高？"
                />
              </label>
              <label className="flex flex-col gap-1.5 flex-1">
                <span className="text-sm font-medium text-foreground">答案</span>
                <textarea
                  name="answer"
                  defaultValue={editItem?.answer || ''}
                  rows={8}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary resize-none"
                  placeholder="输入标准答案…"
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">分类</span>
                  <select
                    name="category"
                    defaultValue={editItem?.category || '通用'}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                  >
                    {categoryOptions.filter(c => c !== '全部分类').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="通用">通用</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">状态</span>
                  <select
                    name="status"
                    defaultValue={editItem?.status || '已发布'}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                  >
                    {TABS.filter(t => t !== '全部').map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>
            </form>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <button type="button" onClick={() => setFormOpen(false)} disabled={formSaving} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50">
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  const form = document.querySelector<HTMLFormElement>('form')
                  form?.requestSubmit()
                }}
                disabled={formSaving}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {formSaving && <Loader2 className="size-4 animate-spin" />}
                {editItem ? '保存修改' : '创建 FAQ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 删除确认弹窗 ===== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground">确认删除</h3>
                <p className="text-sm text-muted-foreground">
                  确定要删除「{deleteTarget.question.slice(0, 30)}…」吗？
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleteLoading} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50">
                取消
              </button>
              <button type="button" onClick={handleDelete} disabled={deleteLoading} className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:opacity-50">
                {deleteLoading && <Loader2 className="size-4 animate-spin" />}
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
