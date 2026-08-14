'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, CheckCircle2, XCircle, X, Eye, Pencil, Loader2 } from 'lucide-react'
import { getQARecords, getQAStats, updateQARecord, createFaq } from '@/lib/admin-api'
import { PageHeader, Panel, Pagination } from '@/components/admin/admin-ui'
import { cn } from '@/lib/utils'

const TABS = ['全部', '待优化', '已优化', '已转FAQ'] as const
const TAB_STATUS: Record<string, string> = { '待优化': 'pending', '已优化': 'optimized', '已转FAQ': 'converted' }

export default function QaPage() {
  const [records, setRecords] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [tab, setTab] = useState<string>('全部')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // 弹窗
  const [viewItem, setViewItem] = useState<any>(null)
  const [editItem, setEditItem] = useState<any>(null)
  const [editAnswer, setEditAnswer] = useState('')
  const [saving, setSaving] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 2000)
  }, [])

  // 获取列表
  const fetchRecords = useCallback(() => {
    setLoading(true)
    setError(null)
    const params: any = { page, page_size: pageSize }
    if (keyword) params.keyword = keyword
    if (TAB_STATUS[tab]) params.status = TAB_STATUS[tab]

    getQARecords(params)
      .then((d) => {
        setRecords(d.items || [])
        setTotal(d.total)
      })
      .catch((err) => {
        console.error('获取问答记录失败:', err)
        setError('无法连接后端服务')
      })
      .finally(() => setLoading(false))
  }, [page, pageSize, keyword, tab])

  // 获取统计
  const fetchStats = useCallback(() => {
    getQAStats().then(setStats).catch(() => {})
  }, [])

  useEffect(() => { fetchRecords() }, [fetchRecords])
  useEffect(() => { fetchStats() }, [fetchStats])

  // 查看详情
  const handleView = (item: any) => {
    setViewItem(item)
  }

  // 打开编辑
  const handleEdit = (item: any) => {
    setEditItem(item)
    setEditAnswer(item.answer || '')
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editItem) return
    setSaving(true)
    try {
      await updateQARecord(editItem.id, { answer: editAnswer })
      showToast('答案已保存，已同步到知识库并更新AI索引')
      setEditItem(null)
      fetchRecords()
    } catch {
      showToast('保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 新建 FAQ
  const handleCreateFaq = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const question = (fd.get('question') as string || '').trim()
    const answer = (fd.get('answer') as string || '').trim()
    if (!question) { showToast('请输入问题'); return }
    setSaving(true)
    try {
      await createFaq({ question, answer, category: 'FAQ', status: '已发布' })
      showToast('FAQ 已创建')
      setCreateOpen(false)
    } catch {
      showToast('创建失败')
    } finally {
      setSaving(false)
    }
  }

  // 统计卡片数据
  const statCards = stats ? [
    { label: '问答总量', value: String(stats.total), color: 'text-blue-500' },
    { label: 'AI自主回答', value: String(stats.ai_answered), color: 'text-emerald-500' },
    { label: '待优化', value: String(stats.pending_opt), color: 'text-amber-500', desc: '回答不足50字' },
    { label: '已优化+转FAQ', value: `${stats.optimized}+${stats.converted_faq}`, color: 'text-violet-500' },
  ] : []

  return (
    <div>
      <PageHeader
        title="智能问答管理"
        desc="查看游客提问、维护标准答案与命中效果，持续优化 AI 问答质量。"
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
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
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-[0_4px_14px_rgb(80,120,200,0.05)]">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={cn('mt-2 text-2xl font-bold', s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 错误 */}
      {error && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</div>
      )}

      {/* 主面板 */}
      <Panel className="mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setPage(1) }}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
              placeholder="搜索问题..."
              className="w-52 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-2 py-3 font-medium">问题</th>
                <th className="px-2 py-3 font-medium">意图分类</th>
                <th className="px-2 py-3 font-medium">满意度</th>
                <th className="px-2 py-3 font-medium">质量状态</th>
                <th className="px-2 py-3 font-medium">响应耗时</th>
                <th className="px-2 py-3 font-medium">时间</th>
                <th className="px-2 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    <Loader2 className="inline-block size-5 animate-spin mr-2" />加载中...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    暂无匹配的问答记录
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="border-b border-border/70 text-sm transition-colors hover:bg-secondary/40">
                    <td className="px-2 py-3 max-w-xs">
                      <p className="truncate font-medium text-foreground">{r.question}</p>
                    </td>
                    <td className="px-2 py-3">
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                        {r.intent || '未分类'}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      {r.satisfaction_score != null ? (
                        <span className={cn(
                          'rounded-md px-2 py-0.5 text-xs font-medium',
                          r.satisfaction_score >= 4 ? 'bg-emerald-50 text-emerald-600' :
                          r.satisfaction_score >= 3 ? 'bg-blue-50 text-blue-600' :
                          'bg-amber-50 text-amber-600'
                        )}>
                          {r.satisfaction_score} 分
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      {r.satisfaction_score != null ? (
                        r.satisfaction_score <= 2 ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-600">
                            <XCircle className="size-3" /> 待优化
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-600">
                            <CheckCircle2 className="size-3" /> 已优化
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500">
                          未评分
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-muted-foreground text-xs">
                      {r.response_time_ms ? `${r.response_time_ms}ms` : '—'}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('zh-CN') : '—'}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => handleView(r)}
                          className="rounded-md px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/5">
                          <Eye className="size-3.5 inline mr-1" />查看
                        </button>
                        <button type="button" onClick={() => handleEdit(r)}
                          className="rounded-md px-2 py-1 text-xs text-foreground transition-colors hover:bg-secondary">
                          <Pencil className="size-3.5 inline mr-1" />
{r.optimized ? '编辑' : '补充答案'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">共 {total} 条</span>
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} />
        </div>
      </Panel>

      {/* ===== 查看详情弹窗 ===== */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewItem(null)}>
          <div className="w-full max-w-xl max-h-[80vh] rounded-2xl bg-card shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">问答详情</h3>
              <button onClick={() => setViewItem(null)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">🙋 用户问题</p>
                <p className="text-sm text-foreground bg-secondary/50 rounded-xl p-3">{viewItem.question}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">🤖 AI 回答</p>
                <p className="text-sm text-foreground bg-blue-50/50 rounded-xl p-3 whitespace-pre-wrap">{viewItem.answer || '(暂无回答)'}</p>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>意图：{viewItem.intent || '未分类'}</span>
                <span>情感：{viewItem.emotion || '—'}</span>
                <span>满意度：{viewItem.satisfaction ?? '—'}</span>
                <span>耗时：{viewItem.response_time_ms ? `${viewItem.response_time_ms}ms` : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 编辑答案弹窗 ===== */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditItem(null)}>
          <div className="w-full max-w-xl max-h-[80vh] rounded-2xl bg-card shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">
                {(editItem.satisfaction ?? 0) >= 3 ? '编辑答案' : '补充答案'}
              </h3>
              <button onClick={() => setEditItem(null)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              <p className="text-sm font-medium text-foreground">{editItem.question}</p>
              <textarea
                value={editAnswer}
                onChange={(e) => setEditAnswer(e.target.value)}
                rows={10}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary resize-none"
                placeholder="输入或修改答案..."
              />
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <button onClick={() => setEditItem(null)} disabled={saving}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50">
                取消
              </button>
              <button onClick={handleSaveEdit} disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50">
                {saving && <Loader2 className="size-4 animate-spin" />}保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 新建 FAQ 弹窗 ===== */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setCreateOpen(false)}>
          <div className="w-full max-w-lg max-h-[80vh] rounded-2xl bg-card shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">新建 FAQ</h3>
              <button onClick={() => setCreateOpen(false)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFaq} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">问题 <span className="text-rose-500">*</span></span>
                <input name="question" required
                  className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                  placeholder="例：灵山大佛有多高？" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">答案</span>
                <textarea name="answer" rows={8}
                  className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary resize-none"
                  placeholder="输入标准答案..." />
              </label>
            </form>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <button onClick={() => setCreateOpen(false)} disabled={saving}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50">
                取消
              </button>
              <button onClick={() => { const f = document.querySelector('form'); if (f) f.requestSubmit() }} disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50">
                {saving && <Loader2 className="size-4 animate-spin" />}创建 FAQ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
