'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, PlayCircle, HelpCircle, Loader2 } from 'lucide-react'

// 配图映射
const SPOT_IMAGES: Record<string, string> = {
  '灵山大照壁': '/LS-001.jpg', '五明桥': '/LS-002.jpg', '佛足坛': '/LS-003.jpg',
  '五智门': '/LS-004.jpg', '山门殿': '/LS-004.jpg', '菩提大道': '/LS-005.jpg',
  '九龙灌浴': '/LS-006.jpg', '降魔浮雕': '/LS-007.jpg', '阿育王柱': '/LS-008.jpg',
  '百子戏弥勒': '/LS-009.jpg', '弥勒戏沙图': '/LS-009.jpg',
  '祥符禅寺': '/LS-010.jpg', '灵山大佛': '/LS-011.jpg',
  '佛教文化博览馆': '/LS-012.jpg', '佛教文化博物馆': '/LS-012.jpg',
  '灵山梵宫': '/LS-013.jpg', '五印坛城': '/LS-014.jpg',
  '曼飞龙塔': '/LS-015.jpg', '曼荼罗塔': '/LS-015.jpg', '无尽意斋': '/LS-016.jpg',
  '拈花广场': '/NH-001.jpg', '四季花海': '/NH-002.jpg', '梵天花海': '/NH-002.jpg',
  '禅意商街': '/NH-003.jpg', '香月花街': '/NH-003.jpg', '拈花堂': '/NH-004.jpg',
}

function _spotQuestions(name: string): string[] {
  const qs: Record<string, string[]> = {
    '灵山大佛': ['灵山大佛有多高？用了多少铜？', '灵山大佛的手印分别代表什么？', '登上大佛脚下需要走多少级台阶？'],
    '九龙灌浴': ['九龙灌浴的表演每天几点开始？', '"花开见佛"是什么意思？', '九龙灌浴的水可以喝吗？'],
    '灵山梵宫': ['灵山梵宫为什么被称为"东方卢浮宫"？', '梵宫里的飞天壁画有什么故事？', '梵宫的素斋怎么样？'],
    '五印坛城': ['五印坛城和西藏的布达拉宫有关系吗？', '坛城里的转经筒怎么使用？', '五印代表什么含义？'],
    '祥符禅寺': ['祥符禅寺建于哪个朝代？', '寺里最古老的树有多少年了？', '祥符禅寺有哪些著名的文物？'],
    '阿育王柱': ['阿育王柱上的经文是什么意思？', '为什么叫"阿育王"？', '这根石柱有多重？'],
    '降魔浮雕': ['降魔浮雕讲述的是什么故事？', '浮雕全长多少米？用了什么工艺？', '降魔浮雕和灵山大佛有什么关系？'],
    '百子戏弥勒': ['为什么弥勒佛身上有100个小孩？', '"百子"在中国文化中代表什么？', '摸摸弥勒肚皮有什么讲究吗？'],
    '菩提大道': ['菩提大道两侧种的是什么树？', '菩提树在佛教中有什么特殊意义？', '走完菩提大道需要多长时间？'],
    '灵山大照壁': ['灵山大照壁上的字是谁题写的？', '照壁在佛教建筑中起什么作用？', '为什么景区入口要放大照壁？'],
  }
  if (qs[name]) return qs[name]
  return [`${name}有什么历史故事？`, `${name}附近还有哪些值得看的？`, `${name}有什么独特的看点？`]
}

interface Props {
  spotName?: string
  style?: string
  duration?: string
  playing?: boolean
  onSpotClick?: (name: string) => void
  onQuestionClick?: (q: string) => void
  onMoreClick?: () => void
  spots?: { name: string; spot_id?: string; image?: string }[]
}

const STYLE_LABELS: Record<string, string> = {
  history: '历史文化', folklore: '民间故事', architecture: '建筑特色', family: '亲子讲解',
}
const DURATION_LABELS: Record<string, string> = {
  quick: '30秒', standard: '3分钟', deep: '5分钟',
}

export function GuidePanel({
  spotName = '灵山大佛', style = 'history', duration = 'standard', playing = false,
  onSpotClick, onQuestionClick, onMoreClick, spots,
}: Props) {
  // 相关景点：Neo4j 知识图谱实时查询
  const [relatedSpots, setRelatedSpots] = useState<{ name: string; image: string }[]>([])
  const [relatedLoading, setRelatedLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setRelatedLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/agent/graph-visualize?query=${encodeURIComponent(spotName)}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        // 收集图中所有关联的景点名（排除当前选中 + 排除非景点标签）
        const relatedSet = new Set<string>()
        const EXCLUDE_TYPES = new Set(['Tag', 'CulturalConcept', 'Person', 'Dynasty', 'Route', 'Area', ''])
        const nodes = data.nodes || []
        for (const edge of (data.edges || [])) {
          if (relatedSet.size >= 4) break
          // 过滤：只接受 Spot 类型 + 名字在已知景点列表中
          for (const side of ['source', 'target'] as const) {
            const name = edge[side]
            const node = nodes.find((n: any) => n.name === name)
            const ntype = node?.type || ''
            if (name !== spotName && !EXCLUDE_TYPES.has(ntype) && name in SPOT_IMAGES && !relatedSet.has(name)) {
              relatedSet.add(name)
            }
          }
        }
        const related = Array.from(relatedSet).slice(0, 4)
        setRelatedSpots(related.map(name => ({
          name,
          image: SPOT_IMAGES[name] || '',
        })))
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setRelatedLoading(false) })
    return () => { cancelled = true }
  }, [spotName])

  // 降级：无图谱数据时用全局景点列表
  const fallback = spots && spots.length > 0
    ? spots.filter(s => s.name !== spotName).slice(0, 4).map(s => ({ name: s.name, image: s.image || '' }))
    : []
  const display = relatedSpots.length > 0 ? relatedSpots : fallback

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-56">
      {/* 相关景点 — Neo4j 图谱查询 */}
      <section className="rounded-xl bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.16)]">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">相关景点</h3>
          <span className="text-xs text-muted-foreground">图谱关联</span>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {relatedLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="size-3.5 animate-spin" />查询图谱中...
            </div>
          )}
          {!relatedLoading && display.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">暂无关联景点</p>
          )}
          {!relatedLoading && display.map((s) => (
            <button key={s.name} type="button" onClick={() => onSpotClick?.(s.name)}
              className="group flex items-center gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-secondary">
              {s.image ? (
                <img src={s.image} alt={s.name} className="size-10 shrink-0 rounded-md object-cover" />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">{s.name.slice(0, 2)}</span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{s.name}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
            </button>
          ))}
        </div>
      </section>

      {/* 讲解摘要 */}
      <section className="rounded-xl bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.16)]">
        <h3 className="text-base font-bold text-foreground">讲解摘要</h3>
        <dl className="mt-3 flex flex-col gap-2.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">当前景点：</dt><dd className="font-medium text-foreground">{spotName}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">讲解风格：</dt><dd className="font-medium text-foreground">{STYLE_LABELS[style] || style}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">讲解时长：</dt><dd className="font-medium text-foreground">{DURATION_LABELS[duration] || duration}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">状态：</dt>
            <dd className={`flex items-center gap-1 font-medium ${playing ? 'text-emerald-500' : 'text-muted-foreground'}`}>
              <PlayCircle className="size-4" />{playing ? '播放中' : '已暂停'}
            </dd>
          </div>
        </dl>
      </section>

      {/* 猜你想问 */}
      <section className="rounded-xl bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.16)]">
        <div className="flex items-center gap-2">
          <HelpCircle className="size-5 text-primary" /><h3 className="text-base font-bold text-foreground">猜你想问</h3>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {_spotQuestions(spotName).map((q) => (
            <button key={q} type="button" onClick={() => onQuestionClick?.(q)}
              className="group flex items-center justify-between gap-2 rounded-lg border border-border bg-card/60 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-secondary">
              <span className="min-w-0 flex-1">{q}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
            </button>
          ))}
        </div>
      </section>
    </aside>
  )
}
