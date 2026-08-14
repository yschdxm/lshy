'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, Send, Headphones, Square } from 'lucide-react'
import { bottomTags } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

type BottomInputProps = {
  placeholder?: string; showTags?: boolean; variant?: 'mic' | 'headphone'
  onSend?: (message: string) => void; disabled?: boolean; initialValue?: string
  isSpeaking?: boolean; onStopSpeak?: () => void
}

export function BottomInput({
  placeholder = '请输入您想问的问题....', showTags = true, variant = 'mic',
  onSend, disabled = false, initialValue = '', isSpeaking = false, onStopSpeak,
}: BottomInputProps) {
  const [value, setValue] = useState(initialValue)
  const [isRecording, setIsRecording] = useState(false)
  const [interimText, setInterimText] = useState('')
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef('')  // 用ref避免闭包过期问题

  // 监听外部填输入事件
  useEffect(() => {
    const handler = (e: any) => setValue(e.detail || '')
    window.addEventListener('qa-fill-input', handler)
    return () => window.removeEventListener('qa-fill-input', handler)
  }, [])

  function handleSend() { const msg = value.trim(); if (!msg || disabled) return; onSend?.(msg); setValue('') }

  function toggleVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { alert('您的浏览器不支持语音输入'); return }

    // 正在录音 → 停止
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop()
      return
    }

    // 开始录音
    const recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.interimResults = true  // 实时显示中间结果

    recognition.onstart = () => {
      setIsRecording(true)
      setInterimText('')
    }

    recognition.onresult = (event: any) => {
      // 拼接所有结果
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      transcriptRef.current = transcript
      setInterimText(transcript)
    }

    recognition.onerror = () => {
      setIsRecording(false)
      setInterimText('')
      transcriptRef.current = ''
      recognitionRef.current = null
    }

    recognition.onend = () => {
      // 结束时用ref中的最新文字（避免闭包过期）
      const finalText = transcriptRef.current
      if (finalText) {
        setValue(finalText)
      }
      setIsRecording(false)
      setInterimText('')
      transcriptRef.current = ''
      recognitionRef.current = null
    }

    recognition.start()
    recognitionRef.current = recognition
  }

  return (
    <div className="flex flex-col gap-3">
      {isSpeaking && (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-medium text-primary flex-1">AI 正在讲解中…</span>
          <button onClick={onStopSpeak} className="rounded-xl bg-red-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-600">⏹ 取消播放</button>
        </div>
      )}

      <div className="rounded-3xl border border-white/60 bg-card/70 p-4 shadow-[0_8px_24px_rgb(80,120,200,0.12)] backdrop-blur-md">
        <div className="flex items-center gap-4">
          {variant === 'headphone' ? (
            <button type="button" aria-label="语音讲解" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white text-primary shadow-[0_4px_12px_rgb(80,120,200,0.12)] transition-colors hover:bg-secondary"><Headphones className="size-5" /></button>
          ) : (
            <button type="button" onClick={toggleVoice} disabled={disabled}
              className={cn('flex shrink-0 flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs transition-colors', isRecording ? 'bg-red-100 text-red-600' : 'bg-secondary/70 text-muted-foreground hover:bg-accent')}>
              <span className={cn('flex size-9 items-center justify-center rounded-full', isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-primary/10 text-primary')}>
                {isRecording ? <Square className="size-4" /> : <Mic className="size-5" />}
              </span>
              <span>{isRecording ? '点击结束' : '点击说话'}</span>
            </button>
          )}

          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/60 bg-white px-4 py-2.5 shadow-[0_4px_12px_rgb(80,120,200,0.08)]">
            <input type="text" placeholder={isRecording ? '正在聆听…' : placeholder} value={isRecording ? interimText : value} onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()} disabled={disabled}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            <button type="button" onClick={handleSend} disabled={disabled || !value.trim()}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-[0_6px_16px_rgb(80,120,200,0.28)] transition-colors hover:bg-primary/90 disabled:opacity-50"><Send className="size-4" /><span>发送</span></button>
          </div>
        </div>

        {showTags && (
          <div className="mt-3 flex flex-wrap items-center gap-3 pl-2">
            {bottomTags.map((tag) => (
              <button key={tag} type="button" onClick={() => setValue(tag)} disabled={disabled}
                className="rounded-lg px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50">{tag}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
