'use client'

import { useState } from 'react'
import {
  Clock,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Share2,
  FileText,
  ChevronRight,
  X,
} from 'lucide-react'
import {
  quickQuestions,
  chatMessages,
  sources,
  chatHistory,
} from '@/lib/mock-data'

export function QaChat() {
  const [showHistory, setShowHistory] = useState(false)

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="inline-block border-b-2 border-primary pb-1 text-2xl font-bold text-foreground">
            智能问答
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            有问题尽管问我，我会为您提供准确的解答
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowHistory(true)}
          className="flex shrink-0 items-center gap-2 rounded-full border border-white/60 bg-card/70 px-4 py-2 text-sm text-foreground shadow-[0_6px_16px_rgb(80,120,200,0.10)] backdrop-blur-md transition-colors hover:bg-card"
        >
          <Clock className="size-4 text-primary" />
          <span>问答记录</span>
        </button>
      </div>

      {/* Quick questions */}
      <div className="mt-5">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">猜你想问</span> / 请你提问
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {quickQuestions.map((q) => (
            <button
              key={q}
              type="button"
              className="rounded-full border border-white/60 bg-white px-4 py-2 text-sm text-foreground shadow-[0_4px_12px_rgb(80,120,200,0.08)] transition-colors hover:bg-secondary"
            >
              {q}
            </button>
          ))}
          <button
            type="button"
            aria-label="换一批"
            className="flex size-9 items-center justify-center rounded-full border border-white/60 bg-white text-muted-foreground shadow-[0_4px_12px_rgb(80,120,200,0.08)] transition-colors hover:text-primary"
          >
            <RefreshCw className="size-4" />
          </button>
        </div>
      </div>

      {/* Chat messages */}
      <div className="mt-6 flex flex-col gap-6">
        {chatMessages.map((msg) =>
          msg.role === 'user' ? (
            <div key={msg.id} className="flex items-start justify-end gap-3">
              <div className="max-w-lg rounded-2xl rounded-tr-sm bg-primary/10 px-5 py-3">
                <p className="text-foreground">{msg.paragraphs[0]}</p>
                <p className="mt-2 text-right text-xs text-muted-foreground">
                  {msg.time}
                </p>
              </div>
              <img
                src="/avatar.png"
                alt="游客头像"
                className="size-10 shrink-0 rounded-full object-cover"
              />
            </div>
          ) : (
            <div key={msg.id} className="flex items-start gap-3">
              <img
                src="/digital-human.png"
                alt="AI 助手"
                className="size-10 shrink-0 rounded-full object-cover object-top"
              />
              <div className="max-w-2xl rounded-2xl rounded-tl-sm border border-white/60 bg-white px-5 py-4 shadow-[0_6px_16px_rgb(80,120,200,0.10)]">
                <div className="flex flex-col gap-1.5 leading-relaxed text-foreground">
                  {msg.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{msg.time}</span>
                  <div className="flex items-center gap-5 text-sm text-muted-foreground">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 transition-colors hover:text-primary"
                    >
                      <ThumbsUp className="size-4" />
                      <span>有用</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 transition-colors hover:text-primary"
                    >
                      <ThumbsDown className="size-4" />
                      <span>没用</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 transition-colors hover:text-primary"
                    >
                      <Share2 className="size-4" />
                      <span>分享</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ),
        )}
      </div>

      {/* Sources */}
      <div className="mt-6">
        <p className="text-sm">
          <span className="font-semibold text-foreground">资料来源</span>{' '}
          <span className="text-muted-foreground">（点击查看详情）</span>
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((s) => (
            <button
              key={s.title}
              type="button"
              className="group flex items-center gap-3 rounded-xl border border-white/60 bg-white p-3 text-left shadow-[0_4px_12px_rgb(80,120,200,0.08)] transition-colors hover:bg-secondary"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {s.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.updatedAt}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
            </button>
          ))}
        </div>
      </div>

      {/* History modal */}
      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="历史对话"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgb(80,120,200,0.28)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">历史对话</h3>
              </div>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => setShowHistory(false)}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto p-5">
              {chatHistory.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="group rounded-xl border border-border bg-card/60 p-4 text-left transition-colors hover:bg-secondary"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-foreground">{item.question}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.date}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {item.answer}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
