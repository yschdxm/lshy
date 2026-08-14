/**
 * 数据适配层 — API 优先 + Mock 降级
 * 不破坏现有组件，只替换数据来源
 */
'use client'

import { useEffect, useState } from 'react'
import * as api from '@/lib/api'
import type { SpotItem } from '@/lib/api'

// ============================================================
// 景点数据 Hook
// ============================================================
export function useSpots() {
  const [spots, setSpots] = useState<SpotItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getSpots({ page_size: 30 }).then((r) => {
      setSpots(r.items || [])
    }).catch(() => {
      // 降级到 mock
      import('@/lib/mock-data').then((m) => {
        setSpots(m.guideSpots.map((s: any) => ({ spot_name: s.name, spot_id: s.key, ...s })) as any)
      })
    }).finally(() => setLoading(false))
  }, [])

  return { spots, loading }
}

export function useHotSpots(limit = 6) {
  const [spots, setSpots] = useState<SpotItem[]>([])

  useEffect(() => {
    api.getHotSpots(limit).then((r) => {
      setSpots(r.items || [])
    }).catch(() => {
      import('@/lib/mock-data').then((m) => {
        setSpots(m.recommendSpots.map((s: any) => ({ spot_name: s.name, ...s })) as any)
      })
    })
  }, [limit])

  return { spots }
}

// ============================================================
// 路线推荐 Hook
// ============================================================
export function useRouteRecommend() {
  const [result, setResult] = useState<api.RouteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function recommend(prefs: {
    duration_hours: number
    interests?: string[]
    companions?: string
    energy_level?: string
  }) {
    setLoading(true)
    setError('')
    try {
      const r = await api.recommendRoute(prefs)
      setResult(r)
      return r
    } catch (e: any) {
      setError(e.message || '推荐失败')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { result, loading, error, recommend }
}

// ============================================================
// 灵山记忆 / 明信片 Hook
// ============================================================
export function useSouvenir() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function generate(sessionId?: string) {
    setLoading(true)
    try {
      const r = await api.generateSouvenir(sessionId || 'demo')
      setResult(r)
      return r
    } catch {
      // 降级 mock
      const m = await import('@/lib/mock-data')
      setResult({
        journey_summary: '今天在灵山胜境度过了一段难忘的旅程...',
        route_map: [{ order: 1, spot: '灵山大佛' }, { order: 2, spot: '九龙灌浴' }, { order: 3, spot: '灵山梵宫' }],
        knowledge_cards: m.postcardRecords.map((r: any) => ({ spot: r.spot, title: r.title, content: r.style, icon: '🏯' })),
        virtual_photo: { spot: '灵山大佛', style: '禅意', description: '在灵山大佛前留下美好记忆' },
        share_text: '灵山胜境一游！',
      })
    } finally {
      setLoading(false)
    }
  }

  return { result, loading, generate }
}

// ============================================================
// 反馈提交 Hook
// ============================================================
export function useFeedback() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(data: {
    type: string; content: string; score: number
    spot_name?: string; contact?: string
  }) {
    setLoading(true)
    try {
      await api.submitFeedback(data)
      setSubmitted(true)
    } catch {
      setSubmitted(true) // 降级：假装成功
    } finally {
      setLoading(false)
    }
  }

  return { submitted, loading, submit }
}
