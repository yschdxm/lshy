'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Clock, RefreshCw, ThumbsUp, ThumbsDown, Share2,
  X, Loader2, Volume2,
} from 'lucide-react'
import { quickQuestionGroups } from '@/lib/mock-data'
import { agentChat, rateAnswer, getFollowUps, type AgentStep } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  time: string
  steps?: AgentStep[]
  isStreaming?: boolean
  feedback?: 'like' | 'dislike'
}

// TTS
const VOICES: Record<string, string> = {
  '默认女声': 'mimo_default', '冰糖': '冰糖', '茉莉': '茉莉',
  '苏打(男)': '苏打', '白桦(男)': '白桦',
}
import { speak as ttsSpeak, stop as ttsStop, onTTSStateChange } from '@/lib/tts-controller'

// Props
interface Props {
  onSendReady?: (fn: (msg: string) => void) => void
  onStateChange?: (state: 'idle' | 'thinking' | 'speaking', bubble?: string) => void
}

export function QaChatLive({ onSendReady, onStateChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyItems, setHistoryItems] = useState<{ id: number; question: string; answer: string; date: string }[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  async function loadHistory() {
    setHistoryLoading(true)
    try {
      const headers: Record<string,string> = {}
      const token = localStorage.getItem('token')
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/ai/history?session_id=${sessionId}&limit=50`, { headers })
      const data = await res.json()
      setHistoryItems(data.items || [])
    } catch { setHistoryItems([]) }
    finally { setHistoryLoading(false) }
    setShowHistory(true)
  }
  const [showSteps, setShowSteps] = useState<Record<string, boolean>>({})
  const [ttsVoice, setTtsVoice] = useState('mimo_default')
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null)
  const [dhEnabled, setDhEnabled] = useState(false)
  const [qGroupIdx, setQGroupIdx] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  // 持久 sessionId：已登录用 user_id，否则用时间戳
  const [sessionId] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      if (u.id) return `user_${u.id}`
    } catch {}
    return `s_${Date.now()}`
  })
  const lastSendRef = useRef('')
  const lastUserQ = useRef('')
  const [followUps, setFollowUps] = useState<string[]>([])
  const abortRef = useRef<(() => void) | null>(null)  // 中断旧请求

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, 50)
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  // 检测讯飞数字人是否活动（决定是否显示 Web TTS 音色选择器）
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/digital-human/active`)
      .then(r => r.json())
      .then(cfg => setDhEnabled(!!cfg.avatar_id))
      .catch(() => setDhEnabled(false))
  }, [])

  // 同步 TTS 状态到父组件
  useEffect(() => {
    return onTTSStateChange((state) => {
      onStateChange?.(state)
      if (state === 'idle') setSpeakingMsgId(null)
    })
  }, [onStateChange])

  // 暴露 sendMessage 给父组件（每次渲染都更新，避免闭包过期导致history为空）
  useEffect(() => {
    onSendReady?.(sendMessage)
  })

  function sendMessage(text: string) {
    if (isThinking) return
    if (text === lastSendRef.current) return  // 防重复
    lastSendRef.current = text
    lastUserQ.current = text

    onStateChange?.('thinking', '正在为您查找答案...')

    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', content: text, time: now() }
    const aiMsg: Message = { id: `a_${Date.now()}`, role: 'ai', content: '', time: '', steps: [], isStreaming: true }
    setMessages((prev) => [...prev, userMsg, aiMsg])
    setIsThinking(true)

    // 构建历史对话（最近6轮），传给后端实现多轮对话
    const history: { role: string; content: string }[] = []
    for (let i = messages.length - 1; i >= 0 && history.length < 12; i--) {
      const m = messages[i]
      if (m.role === 'ai' && m.content) history.unshift({ role: 'assistant', content: m.content })
      else if (m.role === 'user') history.unshift({ role: 'user', content: m.content })
    }

    // 中断上一个未完成的请求
    abortRef.current?.()
    abortRef.current = agentChat(
      text, sessionId,
      // onStep
      (step) => {
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'ai') last.steps = [...(last.steps || []), step]
          return updated
        })
      },
      // onAnswer
      (answer) => {
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'ai') { last.content = answer; last.time = now() }
          return updated
        })
        setIsThinking(false)
        // AI 衍生推荐问题（后端代理 LLM，密钥不进浏览器）
        const userQ = lastUserQ.current || ''
        getFollowUps(userQ, answer).then((d) => {
          if (d?.questions?.length) setFollowUps(d.questions.slice(0, 4))
        }).catch(() => {})
        // 统一语音播报
        onStateChange?.('speaking', answer.slice(0, 100))
        ttsSpeak(answer)
      },
      // onDone
      (done) => {
        setIsThinking(false)
        if (done.record_id) {
          setMessages((prev) => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last.role === 'ai') (last as any).recordId = done.record_id
            return updated
          })
        }
      },
      // onError
      () => {
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'ai') { last.content = '抱歉，AI 服务暂时不可用。'; last.isStreaming = false }
          return updated
        })
        setIsThinking(false)
        onStateChange?.('idle')
      },
      history,
    )
  }

  function toggleSteps(msgId: string) {
    setShowSteps((prev) => ({ ...prev, [msgId]: !prev[msgId] }))
  }

  function handleFeedback(msgId: string, type: 'like' | 'dislike') {
    setMessages((prev) => prev.map((m) => {
      if (m.id !== msgId) return m
      // 同步到后端：like→5分，dislike→1分
      const recordId = (m as any).recordId
      if (recordId > 0) rateAnswer(recordId, type === 'like' ? 5 : 1).catch(() => {})
      return { ...m, feedback: type }
    }))
  }

  function handleShare(text: string) {
    if (navigator.share) { navigator.share({ text }).catch(() => {}) }
    else { navigator.clipboard.writeText(text).then(() => alert('已复制')).catch(() => {}) }
  }

  function handleTTS(msgId: string, text: string) {
    setSpeakingMsgId(msgId)
    ttsSpeak(text)
  }

  function handleStopSpeak() {
    ttsStop()
    setSpeakingMsgId(null)
  }

  const showWelcome = messages.length === 0

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="inline-block border-b-2 border-primary pb-1 text-2xl font-bold text-foreground">智能问答</h2>
          <p className="mt-3 text-sm text-muted-foreground">有问题尽管问我，我会为您提供准确的解答</p>
        </div>
        <div className="flex items-center gap-2">
          {!dhEnabled && (
          <select value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value)}
            className="rounded-full border border-white/60 bg-card/70 px-3 py-1.5 text-xs text-foreground backdrop-blur-md">
            {Object.entries(VOICES).map(([l, k]) => <option key={k} value={k}>{l}</option>)}
          </select>
          )}
          <button type="button" onClick={loadHistory}
            className="flex shrink-0 items-center gap-2 rounded-full border border-white/60 bg-card/70 px-4 py-2 text-sm text-foreground shadow-[0_6px_16px_rgb(80,120,200,0.10)] backdrop-blur-md transition-colors hover:bg-card">
            <Clock className="size-4 text-primary" /><span>问答记录</span>
          </button>
        </div>
      </div>

      {showWelcome && (
        <div className="mt-5">
          <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">猜你想问</span></p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {quickQuestionGroups[qGroupIdx % quickQuestionGroups.length].map((q) => (
              <button key={q} type="button" disabled={isThinking} onClick={() => window.dispatchEvent(new CustomEvent('qa-fill-input', { detail: q }))}
                className="rounded-full border border-white/60 bg-white px-4 py-2 text-sm text-foreground shadow-[0_4px_12px_rgb(80,120,200,0.08)] transition-colors hover:bg-secondary disabled:opacity-50">{q}</button>
            ))}
            <button type="button" aria-label="换一批" onClick={() => setQGroupIdx(i => i + 1)}
              className="flex size-9 items-center justify-center rounded-full border border-white/60 bg-white text-muted-foreground shadow-[0_4px_12px_rgb(80,120,200,0.08)] transition-colors hover:text-primary">
              <RefreshCw className="size-4" />
            </button>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="mt-6 flex max-h-[60vh] flex-col gap-6 overflow-y-auto">
        {messages.map((msg) =>
          msg.role === 'user' ? (
            <div key={msg.id} className="flex items-start justify-end gap-3">
              <div className="max-w-lg rounded-2xl rounded-tr-sm bg-primary/10 px-5 py-3">
                <p className="text-foreground">{msg.content}</p>
                <p className="mt-2 text-right text-xs text-muted-foreground">{msg.time}</p>
              </div>
              <img src="/avatar.png" alt="游客" className="size-10 shrink-0 rounded-full object-cover" />
            </div>
          ) : (
            <div key={msg.id} className="flex items-start gap-3">
              <img src="/digital-human.png" alt="AI" className="size-10 shrink-0 rounded-full object-cover object-top" />
              <div className="max-w-2xl rounded-2xl rounded-tl-sm border border-white/60 bg-white px-5 py-4 shadow-[0_6px_16px_rgb(80,120,200,0.10)]">
                {msg.steps && msg.steps.length > 0 && (
                  <div className="mb-2">
                    <button onClick={() => toggleSteps(msg.id)} className="text-xs text-muted-foreground hover:text-primary">
                      {showSteps[msg.id] ? '▾ 隐藏推理过程' : `▸ 查看推理过程 (${msg.steps.length} 步)`}
                    </button>
                    {showSteps[msg.id] && (
                      <div className="mt-1 rounded-lg border border-dashed border-amber-200 bg-amber-50/50 px-3 py-1.5">
                        {msg.steps.map((s, i) => (
                          <div key={i} className="flex items-center gap-1.5 py-0.5 text-xs text-muted-foreground">
                            <span>{_stepEmoji(s.phase)}</span><span className="truncate">{s.content}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {msg.isStreaming && !msg.content ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />AI 思考中...
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 leading-relaxed text-foreground">
                    {msg.content.split('\n').filter(Boolean).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                )}

                {!msg.isStreaming && msg.content && (
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{msg.time}</span>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <button onClick={() => handleFeedback(msg.id, 'like')}
                        className={cn('flex items-center gap-1.5', msg.feedback === 'like' && 'text-emerald-600')}>
                        <ThumbsUp className="size-4" /><span>有用</span>
                      </button>
                      <button onClick={() => handleFeedback(msg.id, 'dislike')}
                        className={cn('flex items-center gap-1.5', msg.feedback === 'dislike' && 'text-red-500')}>
                        <ThumbsDown className="size-4" /><span>没用</span>
                      </button>
                      <button onClick={() => handleShare(msg.content)}
                        className="flex items-center gap-1.5 hover:text-primary">
                        <Share2 className="size-4" /><span>分享</span>
                      </button>
                      {speakingMsgId === msg.id ? (
                        <button onClick={handleStopSpeak}
                          className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-200">
                          ■ <span>停止</span>
                        </button>
                      ) : (
                        <button onClick={() => handleTTS(msg.id, msg.content)}
                          className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20">
                          <Volume2 className="size-3.5" /><span>听讲解</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ),
        )}
      </div>

      {/* 衍生问题 */}
      {followUps.length > 0 && !isThinking && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">你可能还想问：</span>
          {followUps.map(q => (
            <button key={q} type="button" onClick={() => window.dispatchEvent(new CustomEvent('qa-fill-input', { detail: q }))}
              className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary hover:bg-primary/10 transition-colors">{q}</button>
          ))}
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          role="dialog" aria-modal="true" onClick={() => setShowHistory(false)}>
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgb(80,120,200,0.28)]"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2"><Clock className="size-5 text-primary" /><h3 className="text-lg font-bold text-foreground">历史对话</h3></div>
              <button type="button" aria-label="关闭" onClick={() => setShowHistory(false)}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto p-5">
              {historyLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />加载中...</div>
              ) : historyItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无历史记录</p>
              ) : (
                historyItems.map((item) => (
                  <button key={item.id} type="button"
                    className="group rounded-xl border border-border bg-card/60 p-4 text-left transition-colors hover:bg-secondary">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-foreground text-sm">{item.question}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">{item.date || item.created_at || ''}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.answer}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function _stepEmoji(phase: string): string {
  const m: Record<string, string> = { think: '🤔', plan: '📋', act: '🔧', observe: '👀' }
  return m[phase] || '•'
}
function now() { return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }
