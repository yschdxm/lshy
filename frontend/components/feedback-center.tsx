'use client'

import { useState } from 'react'
import { Send, Star, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { feedbackTypes, ratingLabels } from '@/lib/mock-data'
import { useSpots } from '@/lib/data-adapter'

export function FeedbackCenter() {
  const { spots } = useSpots()
  const [activeType, setActiveType] = useState('service')
  const [selectedSpot, setSelectedSpot] = useState('灵山大佛')
  const [rating, setRating] = useState(4)
  const [hoverRating, setHoverRating] = useState(0)
  const [content, setContent] = useState('')
  const [contact, setContact] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [respMsg, setRespMsg] = useState('')

  const shownRating = hoverRating || rating
  const displaySpots = spots.length > 0 ? spots.map(s => ({ key: s.spot_id || s.spot_name, name: s.spot_name }))
    : [{ key: 'dafo', name: '灵山大佛' }, { key: 'jiulong', name: '九龙灌浴' }, { key: 'fangong', name: '灵山梵宫' }]

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      {/* Title */}
      <div>
        <h2 className="inline-block border-b-2 border-primary pb-1 text-2xl font-bold text-foreground">
          游客反馈
        </h2>
      </div>

      {/* Hero banner */}
      <div className="relative mt-4 overflow-hidden rounded-xl shadow-[0_6px_18px_rgb(80,120,200,0.18)]">
        <img
          src="/feedback-banner.png"
          alt="灵山胜境风光"
          className="h-28 w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.9_0.06_255)] via-[oklch(0.92_0.05_255)]/70 to-transparent" />
        <div className="absolute inset-y-0 left-0 flex flex-col justify-center p-5">
          <h3 className="text-lg font-bold text-slate-800 text-balance">
            您的声音，我们的动力
          </h3>
          <p className="mt-1 max-w-md text-xs text-slate-600 text-pretty">
            分享您的体验和建议，帮助我们做得更好
          </p>
        </div>
      </div>

      {/* Feedback form */}
      <div className="mt-4 rounded-2xl border border-white/60 bg-white p-5 shadow-[0_6px_16px_rgb(80,120,200,0.10)]">
        {/* Feedback type */}
        <p className="mb-3 text-sm font-semibold text-foreground">反馈类型</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {feedbackTypes.map((t) => {
            const isActive = t.key === activeType
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveType(t.key)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-white text-muted-foreground hover:bg-secondary',
                )}
              >
                <t.icon className="size-4 shrink-0" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Spot selection (only for 景点体验) */}
        {activeType === 'experience' && (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="mb-2.5 text-sm font-semibold text-foreground">
              选择评价景点
            </p>
            <div className="flex flex-wrap gap-2.5">
              {displaySpots.slice(0, 10).map((s) => {
                const isActive = s.key === selectedSpot || s.name === selectedSpot
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSelectedSpot(s.name)}
                    className={cn(
                      'flex items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-primary bg-white text-primary shadow-sm'
                        : 'border-border bg-white/70 text-muted-foreground hover:bg-white',
                    )}
                  >
                    <span className="flex size-8 items-center justify-center overflow-hidden rounded-full">
                      <img src={`/${s.key}.jpg`} alt={s.name} className="size-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </span>
                    {s.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Satisfaction rating */}
        <p className="mb-2 mt-5 text-sm font-semibold text-foreground">
          满意度评分
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} 星`}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    'size-8',
                    n <= shownRating
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-muted text-muted',
                  )}
                />
              </button>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            {shownRating.toFixed(1)} {ratingLabels[shownRating]}
          </span>
        </div>

        {/* Feedback content */}
        <p className="mb-2 mt-5 text-sm font-semibold text-foreground">
          反馈内容
        </p>
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 500))}
            placeholder="请分享您的体验、意见或建议，我们会认真对待每一条反馈..."
            rows={4}
            className="w-full resize-none rounded-xl border border-border bg-secondary/30 p-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-white"
          />
          <span className="pointer-events-none absolute bottom-2.5 right-3 text-xs text-muted-foreground">
            {content.length}/500
          </span>
        </div>

        {/* Contact (optional) */}
        <p className="mb-2 mt-4 text-sm font-semibold text-foreground">
          联系方式
          <span className="ml-1 font-normal text-muted-foreground">（选填）</span>
        </p>
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="请输入手机号或邮箱，方便我们与您联系"
          className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-white"
        />

        {/* Submit */}
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true)
              try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/feedback`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: activeType === 'complaint' ? 'complaint' : activeType === 'suggestion' ? 'suggestion' : 'like',
                    content, score: rating, related_spot: selectedSpot, session_id: 'feedback_' + Date.now(),
                  }),
                })
                const data = await res.json()
                setRespMsg(data.message || '感谢您的反馈！')
              } catch { setRespMsg('提交失败，请重试') }
              setSubmitted(true)
              setSubmitting(false)
            }}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_6px_16px_rgb(80,120,200,0.28)] transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {submitting ? '提交中...' : '提交反馈'}
          </button>
          {submitted && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="size-4" />
              {respMsg || '感谢您的反馈，我们已收到！'}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
