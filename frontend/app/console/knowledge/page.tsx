'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  RefreshCw, Upload, Search, Layers, Database, RefreshCcw, DownloadCloud,
  ShieldCheck, X, FileUp, Trash2, ChevronDown, FileText, Eye, Pencil,
  AlertTriangle, CheckCircle2, Loader2,
} from 'lucide-react'
import {
  getKnowledgeStats, getDocs, getDocDetail, createDoc, updateDoc,
  deleteDocApi, batchDocs, rebuildVectorIndex,
} from '@/lib/admin-api'
import type { KnowledgeStats, DocItem, DocList } from '@/lib/admin-api'
import { knowledgeDocs as seedDocs, docStats, docStatusMeta, categoryToneMeta } from '@/lib/admin-data'
import { PageHeader, StatCard, Panel, DonutChart, Pagination } from '@/components/admin/admin-ui'
import { cn } from '@/lib/utils'

// ============================================================
// 常量
// ============================================================
const PAGE_SIZE_OPTIONS = [10, 20, 50]

const CATEGORY_COLORS: Record<string, string> = {
  '历史文化': 'var(--chart-1)',
  '景点讲解': 'var(--chart-3)',
  'FAQ': 'var(--chart-2)',
  '便民服务': 'var(--chart-4)',
  '文化特色': 'var(--chart-5)',
  '活动信息': 'oklch(0.72 0.13 60)',
  '游览路线': 'oklch(0.7 0.04 260)',
  '景区介绍': 'oklch(0.6 0.12 180)',
  '路线规划': 'oklch(0.55 0.08 300)',
  '景点资料': 'oklch(0.65 0.1 200)',
}

const categoryToneFallback = 'text-slate-600 bg-slate-50'

// 状态样式映射
const statusStyleMap: Record<string, string> = {
  '已发布': 'text-emerald-600 bg-emerald-50 border-emerald-200',
  '草稿': 'text-amber-600 bg-amber-50 border-amber-200',
  '已归档': 'text-slate-500 bg-slate-50 border-slate-200',
}

const tips = [
  '建议定期更新知识库内容，保持信息的准确性',
  '文档解析和向量化完成后，AI 问答效果更好',
  '支持的文件格式：PDF、DOCX、TXT、PPTX、XLSX、MD',
]

// ============================================================
// 子组件
// ============================================================

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-border bg-card px-3 py-2 pr-8 text-sm text-foreground outline-none transition-colors hover:border-primary/50 focus:border-primary"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </label>
  )
}

/** 确认删除弹窗 */
function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:opacity-50"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            确认删除
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 主页面
// ============================================================
export default function KnowledgePage() {
  // 数据
  const [docs, setDocs] = useState<DocItem[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<KnowledgeStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 筛选
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('全部分类')
  const [status, setStatus] = useState('全部状态')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // 选择
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // 弹窗
  const [viewDoc, setViewDoc] = useState<DocItem | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [editDoc, setEditDoc] = useState<DocItem | null>(null) // null=新建, 有值=编辑
  const [formOpen, setFormOpen] = useState(false)
  const [formSaving, setFormSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DocItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)

  // Toast
  const [toast, setToast] = useState<string | null>(null)

  // 表单 ref
  const formRef = useRef<HTMLFormElement>(null)

  // 从 API 加载统计的分类列表
  const [categoryOptions, setCategoryOptions] = useState<string[]>(['全部分类'])
  const [statusOptions] = useState<string[]>(['全部状态', '已发布', '草稿', '已归档'])

  // ==================== 数据获取 ====================

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  const fetchDocs = useCallback(() => {
    setLoading(true)
    setError(null)
    const params: any = { page, page_size: pageSize }
    if (keyword) params.keyword = keyword
    if (category && category !== '全部分类') params.category = category
    if (status && status !== '全部状态') params.status = status

    getDocs(params)
      .then((d) => {
        if (d && d.items) {
          setDocs(d.items)
          setTotal(d.total)
        } else {
          setDocs([])
          setTotal(0)
        }
      })
      .catch((err) => {
        console.error('获取文档列表失败:', err)
        setError('无法连接后端服务，请确认服务已启动')
        // 降级到 mock 数据
        setDocs(seedDocs as any)
        setTotal(seedDocs.length)
      })
      .finally(() => setLoading(false))
  }, [page, pageSize, keyword, category, status])

  const fetchStats = useCallback(() => {
    getKnowledgeStats()
      .then((s) => {
        setStats(s)
        // 从 stats 中提取实际分类列表
        if (s?.categories?.length) {
          const names = s.categories.map((c) => c.name).filter(Boolean)
          setCategoryOptions(['全部分类', ...names])
        }
      })
      .catch((err) => console.error('获取统计失败:', err))
  }, [])

  // 初始加载 & 筛选变化时重新加载
  useEffect(() => { fetchDocs() }, [fetchDocs])
  useEffect(() => { fetchStats() }, [fetchStats])

  // ==================== 操作 ====================

  const handleSearch = () => {
    setPage(1)
    fetchDocs()
  }

  const handleReset = () => {
    setKeyword('')
    setCategory('全部分类')
    setStatus('全部状态')
    setPage(1)
  }

  // 查看文档详情
  const handleView = async (doc: DocItem) => {
    setViewDoc(doc) // 先显示列表中的截断内容
    setViewLoading(true)
    try {
      const detail = await getDocDetail(doc.id)
      setViewDoc(detail)
    } catch {
      // 列表数据已展示，不额外处理
    } finally {
      setViewLoading(false)
    }
  }

  // 打开编辑弹窗
  const handleEdit = (doc: DocItem) => {
    setEditDoc(doc)
    setFormOpen(true)
  }

  // 打开新建弹窗
  const handleCreate = () => {
    setEditDoc(null)
    setFormOpen(true)
  }

  // 保存（新建/编辑）
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const data = {
      title: (formData.get('title') as string) || '',
      category: (formData.get('category') as string) || '景点资料',
      content: (formData.get('content') as string) || '',
      status: (formData.get('status') as string) || '已发布',
    }

    if (!data.title.trim()) {
      showToast('请输入文档标题')
      return
    }

    setFormSaving(true)
    try {
      if (editDoc) {
        await updateDoc(editDoc.id, data)
        showToast('文档已更新')
      } else {
        await createDoc(data)
        showToast('文档已创建')
      }
      setFormOpen(false)
      setEditDoc(null)
      fetchDocs()
      fetchStats()
    } catch (err) {
      showToast(`保存失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setFormSaving(false)
    }
  }

  // 删除
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteDocApi(deleteTarget.id)
      showToast(`已删除「${deleteTarget.title}」`)
      setDeleteTarget(null)
      // 从选中列表移除
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(deleteTarget.id)
        return next
      })
      fetchDocs()
      fetchStats()
    } catch (err) {
      showToast(`删除失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setDeleteLoading(false)
    }
  }

  // 上传解析后填入新建表单
  const fillFormAfterUpload = (title: string, content: string) => {
    setEditDoc(null)
    setFormOpen(true)
    setUploadOpen(false)
    setTimeout(() => {
      if (formRef.current) {
        const titleInput = formRef.current.querySelector<HTMLInputElement>('[name="title"]')
        const contentInput = formRef.current.querySelector<HTMLTextAreaElement>('[name="content"]')
        if (titleInput) titleInput.value = title
        if (contentInput) contentInput.value = content
      }
    }, 100)
  }

  // 文件上传 → 读取文本填入新建表单
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 20 * 1024 * 1024) {
      showToast('文件大小不能超过 20MB')
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const isPlainText = ext === 'txt' || ext === 'md'

    if (isPlainText) {
      // 纯文本：前端直接读取
      const reader = new FileReader()
      reader.onload = () => {
        const text = reader.result as string
        const name = file.name.replace(/\.(txt|md)$/i, '')
        fillFormAfterUpload(name, text)
      }
      reader.onerror = () => showToast('文件读取失败')
      reader.readAsText(file, 'UTF-8')
    } else {
      // docx/pdf/xlsx/pptx：上传到后端解析
      const formData = new FormData()
      formData.append('file', file)
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const res = await fetch(`${apiUrl}/api/knowledge/parse-file`, {
          method: 'POST', body: formData,
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.detail || '解析失败')
        }
        const data = await res.json()
        fillFormAfterUpload(data.title, data.content)
      } catch (e: any) {
        showToast(e.message || '文件解析失败')
        setUploadOpen(false)
      }
    }
  }

  // 批量操作
  const handleBatch = async (action: string) => {
    if (selected.size === 0) {
      showToast('请先选择文档')
      setBatchOpen(false)
      return
    }
    setBatchOpen(false)

    if (action === 'delete') {
      setDeleteTarget({ id: 0, title: `${selected.size} 篇文档`, category: '', status: '', content: '', created_at: '', updated_at: '' } as any)
      // 批量删除：逐个调用 API
      setBatchLoading(true)
      let successCount = 0
      for (const id of selected) {
        try {
          await deleteDocApi(id)
          successCount++
        } catch { /* continue */ }
      }
      setBatchLoading(false)
      showToast(`批量删除完成：${successCount}/${selected.size} 成功`)
      setSelected(new Set())
      setDeleteTarget(null)
      fetchDocs()
      fetchStats()
    } else if (action === 'publish') {
      setBatchLoading(true)
      try {
        await batchDocs(Array.from(selected), 'publish')
        showToast(`已将 ${selected.size} 篇文档设为已发布`)
        setSelected(new Set())
        fetchDocs()
      } catch (err) {
        showToast('批量操作失败')
      } finally {
        setBatchLoading(false)
      }
    } else if (action === 'vectorize') {
      showToast(`向量化功能需在后端触发，请使用「更新索引」按钮`)
    }
  }

  // 重建向量索引
  const handleRebuildIndex = async () => {
    setRebuilding(true)
    try {
      await rebuildVectorIndex()
      showToast('✓ 向量索引重建完成')
    } catch (err) {
      showToast('向量索引重建失败，请检查后端日志')
    } finally {
      setRebuilding(false)
    }
  }

  // ==================== 选择 ====================

  const allOnPageSelected = docs.length > 0 && docs.every((d) => selected.has(d.id))
  const toggleAll = () => {
    if (allOnPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        docs.forEach((d) => next.delete(d.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        docs.forEach((d) => next.add(d.id))
        return next
      })
    }
  }
  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ==================== 计算数据 ====================

  const statCards = stats
    ? [
        { key:'total',label:'文档总数',value:String(stats.total),icon:FileText,tint:'bg-blue-50 text-blue-500' },
        { key:'published',label:'已发布',value:String(stats.published),icon:ShieldCheck,tint:'bg-emerald-50 text-emerald-500' },
        { key:'draft',label:'草稿/待处理',value:String(stats.draft),icon:RefreshCcw,tint:'bg-amber-50 text-amber-500' },
        { key:'categories',label:'分类数',value:String(stats.categories?.length||0),icon:Database,tint:'bg-violet-50 text-violet-500' },
      ]
    : []

  // 分类分布数据（用于 DonutChart）
  const categoryDist = (stats?.categories || []).map((c, i) => ({
    name: c.name,
    count: c.count,
    color: CATEGORY_COLORS[c.name] || `oklch(0.6 0.08 ${i * 50})`,
  }))

  const totalDocs = stats?.total || 0

  // ==================== 渲染 ====================

  return (
    <div>
      <PageHeader
        title="知识文档管理"
        desc="管理景区知识库文档，支持文档上传、解析、向量化处理及状态管理，为 AI 问答和讲解提供知识支持。"
        actions={
          <>
            {/* 批量操作下拉 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setBatchOpen((v) => !v)}
                disabled={selected.size === 0}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
              >
                批量操作
                <ChevronDown className="size-4" />
              </button>
              {batchOpen && (
                <div
                  className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-[0_16px_40px_rgb(80,120,200,0.18)]"
                  onMouseLeave={() => setBatchOpen(false)}
                >
                  {[
                    { label: '批量发布', action: 'publish' },
                    { label: '批量向量化', action: 'vectorize' },
                    { label: '批量删除', action: 'delete' },
                  ].map((op) => (
                    <button
                      key={op.action}
                      type="button"
                      onClick={() => handleBatch(op.action)}
                      className="block w-full px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => { fetchDocs(); fetchStats(); showToast('数据已刷新') }}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <RefreshCw className="size-4" />
              刷新
            </button>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              <Upload className="size-4" />
              上传文档
            </button>
          </>
        }
      />

      {/* Stats 卡片 */}
      {statCards.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {statCards.map(({ key, ...s }) => (
            <StatCard key={key} {...s} />
          ))}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}（已降级显示 Mock 数据）</span>
        </div>
      )}

      {/* 主区域 */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        {/* 左侧：筛选 + 表格 */}
        <Panel className="min-w-0 p-4">
          {/* 筛选栏 */}
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-52 flex-1 flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">关键词</span>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <Search className="size-4 text-muted-foreground" />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="搜索文档标题或内容..."
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </label>
            <FilterSelect label="文档分类" value={category} options={categoryOptions} onChange={(v) => { setCategory(v); setPage(1) }} />
            <FilterSelect label="状态" value={status} options={statusOptions} onChange={(v) => { setStatus(v); setPage(1) }} />
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              重置
            </button>
          </div>

          {/* 选中提示 */}
          {selected.size > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2 text-sm">
              <span className="text-foreground">
                已选中 <span className="font-semibold text-primary">{selected.size}</span> 项
              </span>
              <button type="button" onClick={() => setSelected(new Set())} className="text-muted-foreground hover:text-foreground">
                取消选择
              </button>
            </div>
          )}

          {/* 表格 */}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="w-10 px-2 py-3">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                      className="size-4 rounded border-border accent-primary"
                      aria-label="全选"
                    />
                  </th>
                  <th className="px-2 py-3 font-medium">文档标题</th>
                  <th className="px-2 py-3 font-medium">分类</th>
                  <th className="px-2 py-3 font-medium">状态</th>
                  <th className="px-2 py-3 font-medium">内容预览</th>
                  <th className="px-2 py-3 font-medium">更新时间</th>
                  <th className="px-2 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading && docs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      <Loader2 className="inline-block size-5 animate-spin mr-2" />
                      加载中...
                    </td>
                  </tr>
                ) : docs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      没有匹配的文档，请调整筛选条件
                    </td>
                  </tr>
                ) : (
                  docs.map((d) => {
                    const catTone = categoryToneMeta[d.category] || categoryToneFallback
                    const stTone = statusStyleMap[d.status] || 'text-slate-600 bg-slate-50 border-slate-200'
                    return (
                      <tr key={d.id} className="border-b border-border/70 text-sm transition-colors hover:bg-secondary/40">
                        <td className="px-2 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(d.id)}
                            onChange={() => toggleOne(d.id)}
                            className="size-4 rounded border-border accent-primary"
                            aria-label={`选择 ${d.title}`}
                          />
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                              <FileText className="size-5" />
                            </span>
                            <div className="min-w-0 max-w-48">
                              <p className="truncate font-medium text-foreground">{d.title}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium', catTone)}>
                            {d.category || '—'}
                          </span>
                        </td>
                        <td className="px-2 py-3">
                          <span className={cn('rounded-md border px-2 py-0.5 text-xs font-medium', stTone)}>
                            {d.status || '—'}
                          </span>
                        </td>
                        <td className="px-2 py-3 max-w-xs">
                          <p className="truncate text-xs text-muted-foreground">
                            {(d.content || '').slice(0, 80) || '(无内容)'}
                          </p>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap text-xs text-muted-foreground">
                          {d.updated_at ? new Date(d.updated_at).toLocaleString('zh-CN', { month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit' }) : '—'}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center justify-end gap-2 text-sm">
                            <button type="button" onClick={() => handleView(d)} className="rounded-md px-2 py-1 text-primary transition-colors hover:bg-primary/5">
                              <Eye className="size-4" />
                            </button>
                            <button type="button" onClick={() => handleEdit(d)} className="rounded-md px-2 py-1 text-foreground transition-colors hover:bg-secondary">
                              <Pencil className="size-4" />
                            </button>
                            <button type="button" onClick={() => setDeleteTarget(d)} className="rounded-md px-2 py-1 text-rose-500 transition-colors hover:bg-rose-50">
                              <Trash2 className="size-4" />
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

          {/* 底部分页 */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">共 {total} 条</span>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                  className="appearance-none rounded-lg border border-border bg-card px-3 py-1.5 pr-8 text-sm text-foreground outline-none"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}条/页</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} />
            </div>
          </div>
        </Panel>

        {/* 右侧边栏 */}
        <div className="flex flex-col gap-4">
          {/* 分类分布 */}
          <Panel title="知识库概览">
            <p className="mb-3 text-xs text-muted-foreground">文档分类分布</p>
            <div className="flex items-center justify-center">
              <DonutChart data={categoryDist} total={totalDocs} totalLabel="总文档" />
            </div>
            <ul className="mt-4 flex flex-col gap-2.5">
              {categoryDist.length > 0 ? (
                categoryDist.map((c) => (
                  <li key={c.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                      <span className="text-foreground">{c.name}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {c.count} <span className="text-xs">({totalDocs > 0 ? Math.round(c.count / totalDocs * 100) : 0}%)</span>
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground text-center py-2">暂无数据</li>
              )}
            </ul>
          </Panel>

          {/* 快速操作 */}
          <Panel title="快速操作">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleRebuildIndex}
                disabled={rebuilding}
                className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
              >
                {rebuilding ? <Loader2 className="size-4 animate-spin text-primary" /> : <Layers className="size-4 text-primary" />}
                {rebuilding ? '重建中...' : '重构向量索引'}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary"
              >
                <FileUp className="size-4 text-primary" />
                新建文档
              </button>
              <button
                type="button"
                onClick={() => showToast('请在后端配置备份策略')}
                className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary"
              >
                <DownloadCloud className="size-4 text-primary" />
                导出知识库
              </button>
              <button
                type="button"
                onClick={() => showToast('备份功能需配置存储后端')}
                className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary"
              >
                <ShieldCheck className="size-4 text-primary" />
                知识库备份
              </button>
            </div>
          </Panel>

          {/* 系统提示 */}
          <Panel title="系统提示">
            <ul className="flex flex-col gap-2.5">
              {tips.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {/* ========== 查看文档弹窗 ========== */}
      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewDoc(null)}>
          <div className="w-full max-w-2xl max-h-[80vh] rounded-2xl bg-card shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{viewDoc.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {viewDoc.category} · {viewDoc.status} · ID: {viewDoc.id}
                </p>
              </div>
              <button type="button" onClick={() => setViewDoc(null)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {viewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed">
                  {viewDoc.content || '(无内容)'}
                </pre>
              )}
            </div>
            <div className="flex items-center justify-between px-6 py-3 border-t border-border text-xs text-muted-foreground">
              <span>创建: {viewDoc.created_at ? new Date(viewDoc.created_at).toLocaleString('zh-CN') : '—'}</span>
              <span>更新: {viewDoc.updated_at ? new Date(viewDoc.updated_at).toLocaleString('zh-CN') : '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========== 新建/编辑文档弹窗 ========== */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setFormOpen(false)}>
          <div className="w-full max-w-xl max-h-[85vh] rounded-2xl bg-card shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                {editDoc ? '编辑文档' : '新建文档'}
              </h3>
              <button type="button" onClick={() => setFormOpen(false)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                <X className="size-5" />
              </button>
            </div>
            <form ref={formRef} onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
              {/* 标题 */}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">文档标题 <span className="text-rose-500">*</span></span>
                <input
                  name="title"
                  defaultValue={editDoc?.title || ''}
                  required
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                  placeholder="输入文档标题"
                />
              </label>

              {/* 分类 + 状态 */}
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">分类</span>
                  <select
                    name="category"
                    defaultValue={editDoc?.category || '景点资料'}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                  >
                    {categoryOptions.filter(c => c !== '全部分类').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">状态</span>
                  <select
                    name="status"
                    defaultValue={editDoc?.status || '已发布'}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                  >
                    {statusOptions.filter(s => s !== '全部状态').map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* 内容 */}
              <label className="flex flex-col gap-1.5 flex-1">
                <span className="text-sm font-medium text-foreground">文档内容</span>
                <textarea
                  name="content"
                  defaultValue={editDoc?.content || ''}
                  rows={14}
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary resize-none font-mono"
                  placeholder="输入或粘贴文档内容..."
                />
              </label>
            </form>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={formSaving}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => formRef.current?.requestSubmit()}
                disabled={formSaving}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {formSaving && <Loader2 className="size-4 animate-spin" />}
                {editDoc ? '保存修改' : '创建文档'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 文件上传弹窗 ========== */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setUploadOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">上传文档</h3>
              <button type="button" onClick={() => setUploadOpen(false)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                <X className="size-5" />
              </button>
            </div>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-4 py-10 text-center transition-colors hover:border-primary/50">
              <FileUp className="size-8 text-primary" />
              <p className="text-sm font-medium text-foreground">点击选择文本文件</p>
              <p className="text-xs text-muted-foreground">支持 TXT、MD、DOCX，单个不超过 20MB</p>
              <p className="text-xs text-muted-foreground">（文件内容将作为文档正文导入）</p>
              <input
                type="file"
                accept=".txt,.md,.docx,.pdf,.pptx,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <div className="mt-4 flex justify-between">
              <button
                type="button"
                onClick={handleCreate}
                className="text-sm text-primary hover:underline"
              >
                或手动创建文档 →
              </button>
              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 确认删除弹窗 ========== */}
      <ConfirmDialog
        open={!!deleteTarget && deleteTarget.id !== 0}
        title="确认删除"
        message={`确定要删除「${deleteTarget?.title}」吗？此操作不可撤销。`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg flex items-center gap-2">
          {toast.includes('✓') || toast.includes('成功') || toast.includes('完成') ? (
            <CheckCircle2 className="size-4 text-emerald-400" />
          ) : null}
          {toast}
        </div>
      )}
    </div>
  )
}
