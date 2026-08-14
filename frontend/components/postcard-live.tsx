'use client'

import { Sparkles, Loader2, Wand2 } from 'lucide-react'
import { useSouvenir } from '@/lib/data-adapter'

/** AI 生成明信片文案按钮 — 连接灵山记忆 API */
export function PostcardAIGenerate({ onFill }: { onFill?: (data: any) => void }) {
  const { result, loading, generate } = useSouvenir()

  async function handleGenerate() {
    const sid = localStorage.getItem('last_session_id') || undefined
    const r = await generate(sid)
    if (r && onFill) onFill(r)
  }

  if (result && !loading) {
    return (
      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
        <p className="text-xs font-medium text-emerald-700">
          <Sparkles className="mr-1 inline size-3" />
          AI 已基于你的游览记录生成文案
        </p>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
          {result.journey_summary}
        </p>
        <button
          onClick={handleGenerate}
          className="mt-2 text-xs text-primary hover:underline"
        >
          重新生成
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Wand2 className="size-4" />
      )}
      <span>{loading ? 'AI 生成中...' : 'AI 生成文案'}</span>
    </button>
  )
}
