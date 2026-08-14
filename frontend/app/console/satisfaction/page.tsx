'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Star, ThumbsUp, ThumbsDown, MessageSquareText, TrendingUp } from 'lucide-react'
import { getFeedbackOverview, getFeedbackList } from '@/lib/admin-api'
import { PageHeader, Panel } from '@/components/admin/admin-ui'

const TABS = ['全部', '好评', '差评', '建议', '投诉'] as const
const TAB_TYPE: Record<string, string> = { '好评': 'like', '差评': 'dislike', '建议': 'suggestion', '投诉': 'complaint' }

const emojiMap: Record<number, string> = { 1: '😡', 2: '😞', 3: '😐', 4: '😊', 5: '😍' }

export default function SatisfactionPage() {
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [overview, setOverview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<string>('全部')
  const [page, setPage] = useState(1)

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      getFeedbackOverview(),
      getFeedbackList({ page, page_size: 15, type: TAB_TYPE[tab] || undefined }),
    ]).then(([o, d]) => {
      setOverview(o)
      setItems(d.items || [])
      setTotal(d.total)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [page, tab])

  return (
    <div>
      <PageHeader title="游客感受度报告" desc="汇总游客满意度评价，洞察服务口碑与改进方向。"
        actions={<><button onClick={fetchData} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"><RefreshCw className="size-4" />刷新</button></>}
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { label: '累计反馈', value: overview?.total ?? '—', icon: MessageSquareText, color: 'text-blue-500' },
          { label: '今日新增', value: overview?.today ?? '—', icon: TrendingUp, color: 'text-teal-500' },
          { label: '综合均分', value: overview?.avg_score ? `${overview.avg_score}/5` : '—', icon: Star, color: 'text-amber-500' },
          { label: '好评', value: overview?.likes ?? '—', icon: ThumbsUp, color: 'text-emerald-500' },
          { label: '差评', value: overview?.dislikes ?? '—', icon: ThumbsDown, color: 'text-rose-500' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-[0_4px_14px_rgb(80,120,200,0.05)]">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className={`size-5 ${s.color}`} />
            </div>
            <p className={`mt-2 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* 近 7 天趋势（简易文本展示） */}
      {overview?.trend?.length > 0 && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-[0_4px_14px_rgb(80,120,200,0.05)]">
          <p className="text-sm font-semibold text-foreground mb-2">近 7 天评分趋势</p>
          <div className="flex items-end gap-3">
            {overview.trend.map((t: any) => (
              <div key={t.date} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-xs font-medium text-foreground">{t.avg > 0 ? t.avg.toFixed(1) : '—'}</span>
                <div className="w-full rounded-t-md bg-primary/20" style={{ height: `${Math.max(8, (t.avg || 0) * 10)}px` }}>
                  <div className="w-full rounded-t-md bg-primary" style={{ height: `${Math.max(4, (t.avg || 0) * 10)}px` }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{t.date}</span>
                <span className="text-[10px] text-muted-foreground">{t.count}条</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 筛选 */}
      <div className="mt-4 flex items-center gap-1 rounded-lg bg-secondary p-1 w-fit">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => { setTab(t); setPage(1) }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* 反馈列表 */}
      <Panel className="mt-4 p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">加载中...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">暂无反馈记录</p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item: any, i: number) => (
              <div key={item.id || i} className="flex items-start gap-3 rounded-xl border border-border bg-card/60 p-3">
                <span className="mt-0.5 flex size-6 items-center justify-center rounded-full text-xs">
                  {emojiMap[item.score] || '😐'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      item.type === 'like' ? 'bg-emerald-50 text-emerald-600' :
                      item.type === 'complaint' ? 'bg-rose-50 text-rose-600' :
                      item.type === 'suggestion' ? 'bg-blue-50 text-blue-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {item.type === 'like' ? '好评' : item.type === 'complaint' ? '投诉' : item.type === 'suggestion' ? '建议' : '评价'}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.related_spot || '景区'}</span>
                    <span className="text-xs text-muted-foreground">{item.time?.slice(0, 16) || ''}</span>
                    <span className="flex items-center gap-0.5 text-xs text-amber-500">
                      <Star className="size-3 fill-amber-400" />{item.score}
                    </span>
                  </div>
                  {item.content && <p className="mt-1 text-sm text-muted-foreground">{item.content}</p>}
                  {item.contact && <p className="mt-1 text-xs text-muted-foreground">联系方式：{item.contact}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
