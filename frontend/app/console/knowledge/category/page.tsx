'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, Plus, Pencil, Trash2, X, Loader2, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { getKnowledgeStats, renameCategory, deleteCategory } from '@/lib/admin-api'
import type { KnowledgeStats } from '@/lib/admin-api'
import { PageHeader, Panel } from '@/components/admin/admin-ui'
import { cn } from '@/lib/utils'

const CATEGORY_COLORS: Record<string, string> = {
  '历史文化': '#oklch(0.65 0.18 25)',
  '景点讲解': '#oklch(0.6 0.18 160)',
  'FAQ': '#oklch(0.6 0.18 220)',
  '便民服务': '#oklch(0.6 0.18 340)',
  '文化特色': '#oklch(0.65 0.18 55)',
  '活动信息': '#oklch(0.6 0.18 100)',
  '游览路线': '#oklch(0.55 0.08 260)',
  '景点资料': '#oklch(0.6 0.12 190)',
  '路线攻略': '#oklch(0.55 0.1 290)',
}

function getColor(name: string, i: number): string {
  return CATEGORY_COLORS[name] || `oklch(0.6 0.12 ${i * 40})`
}

// ============================================================
export default function CategoryPage() {
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([])
  const [totalDocs, setTotalDocs] = useState(0)
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 弹窗状态
  const [editTarget, setEditTarget] = useState<{ name: string } | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const showToast = useCallback((m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 2500)
  }, [])

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    getKnowledgeStats()
      .then((s) => {
        setCategories(s.categories || [])
        setTotalDocs(s.total)
      })
      .catch((err) => {
        console.error('获取分类统计失败:', err)
        setError('无法连接后端服务')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // 筛选
  const filtered = keyword
    ? categories.filter((c) => c.name.includes(keyword))
    : categories

  // 编辑分类名
  const handleEdit = (name: string) => {
    setEditTarget({ name })
    setEditName(name)
  }

  const handleSaveRename = async () => {
    if (!editTarget || !editName.trim() || editName.trim() === editTarget.name) {
      setEditTarget(null)
      return
    }
    setSaving(true)
    try {
      const r = await renameCategory(editTarget.name, editName.trim())
      showToast(`已重命名，影响 ${r.affected} 篇文档`)
      setEditTarget(null)
      fetchData()
    } catch {
      showToast('重命名失败')
    } finally {
      setSaving(false)
    }
  }

  // 删除分类
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const r = await deleteCategory(deleteTarget)
      showToast(`已删除，共移除 ${r.deleted} 篇文档`)
      setDeleteTarget(null)
      fetchData()
    } catch {
      showToast('删除失败')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="知识分类管理"
        desc="知识分类由文档自动聚合，无法手动创建。编辑分类名会批量更新该分类下所有文档。"
        actions={
          <button
            type="button"
            onClick={fetchData}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            刷新
          </button>
        }
      />

      {/* 统计概况 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: '分类总数', value: categories.length },
          { label: '文档总数', value: totalDocs },
          { label: '平均每类文档', value: categories.length > 0 ? Math.round(totalDocs / categories.length) : 0 },
          { label: '最多文档分类', value: categories.reduce((max, c) => Math.max(max, c.count), 0) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 分类列表 */}
      <Panel className="mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            共 {filtered.length} 个分类
          </span>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索分类名称..."
              className="w-48 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-2 py-3 font-medium">分类名称</th>
                <th className="px-2 py-3 font-medium">文档数</th>
                <th className="px-2 py-3 font-medium">占比</th>
                <th className="px-2 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                    <Loader2 className="inline-block size-5 animate-spin mr-2" />
                    加载中...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                    暂无分类数据
                  </td>
                </tr>
              ) : (
                filtered.map((c, i) => {
                  const pct = totalDocs > 0 ? Math.round(c.count / totalDocs * 100) : 0
                  const color = getColor(c.name, i)
                  return (
                    <tr key={c.name} className="border-b border-border/70 text-sm transition-colors hover:bg-secondary/40">
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-3">
                          <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
                          <span className="font-medium text-foreground">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <span className="text-muted-foreground">{c.count} 篇</span>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-28 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(c.name)}
                            className="rounded-md px-2 py-1 text-sm text-primary transition-colors hover:bg-primary/5"
                          >
                            <Pencil className="size-3.5 inline mr-1" />
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(c.name)}
                            className="rounded-md px-2 py-1 text-sm text-rose-500 transition-colors hover:bg-rose-50"
                          >
                            <Trash2 className="size-3.5 inline mr-1" />
                            删除
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
      </Panel>

      {/* ===== 编辑分类名弹窗 ===== */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">编辑分类名</h3>
              <button type="button" onClick={() => setEditTarget(null)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                <X className="size-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              将「<strong className="text-foreground">{editTarget.name}</strong>」重命名为：
            </p>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">该分类下的所有文档将被批量更新。</p>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setEditTarget(null)} disabled={saving} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50">
                取消
              </button>
              <button type="button" onClick={handleSaveRename} disabled={saving || !editName.trim()} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50">
                {saving && <Loader2 className="size-4 animate-spin" />}
                确认重命名
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 删除分类确认弹窗 ===== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground">确认删除分类</h3>
                <p className="text-sm text-muted-foreground">
                  将删除「{deleteTarget}」分类下的所有文档，不可撤销。
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
