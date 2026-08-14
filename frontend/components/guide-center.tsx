'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Radio, Pause, Play, RotateCcw, Volume2, ListMusic,
  Baby, ChevronRight, ChevronDown, BookMarked, Check, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { speak as ttsSpeak, stop as ttsStop, isSpeaking as ttsIsSpeaking } from '@/lib/tts-controller'
import {
  guideDurations, guideStyles, guideTones, type GuideOption,
} from '@/lib/mock-data'
import { useSpots } from '@/lib/data-adapter'

// TTS 由后端代理（密钥仅存服务端）
import { ttsSynthesize } from '@/lib/api'

function OptionGroup({ title, options, activeKey, onSelect }: {
  title: string; options: GuideOption[]; activeKey: string; onSelect: (k: string) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-white/60 p-2.5">
      <p className="mb-2 text-sm font-semibold text-foreground">{title}</p>
      <div className="flex gap-1.5">
        {options.map((opt) => {
          const isActive = opt.key === activeKey
          return (
            <button key={opt.key} type="button" onClick={() => onSelect(opt.key)}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-xs font-medium transition-colors',
                isActive ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-white text-muted-foreground hover:bg-secondary',
              )}>
              <opt.icon className="size-[18px]" />
              <span className="text-center leading-tight">
                {opt.label.split('\n').map((line, i) => (
                  <span key={i} className="block">{line}</span>
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SpotCard({ s, isActive, onSelect }: {
  s: { key: string; name: string; image: string }; isActive: boolean; onSelect: () => void
}) {
  return (
    <button type="button" onClick={onSelect}
      className={cn(
        'group relative flex items-center gap-2 rounded-xl border bg-white p-1.5 text-left transition-colors',
        isActive ? 'border-primary shadow-[0_6px_16px_rgb(80,120,200,0.18)]' : 'border-border hover:bg-secondary',
      )}>
      <span className="relative shrink-0">
        {s.image ? (
          <img src={s.image} alt={s.name} className="size-8 rounded-md object-cover" />
        ) : (
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">{s.name.slice(0, 2)}</span>
        )}
        {isActive && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-white">
            <Check className="size-2.5" />
          </span>
        )}
      </span>
      <span className="whitespace-nowrap text-sm font-medium text-foreground">{s.name}</span>
    </button>
  )
}

interface CenterProps {
  onStateChange?: (state: { spot?: string; style?: string; duration?: string; playing: boolean }) => void
  externalSpot?: string  // 外部（如右侧面板）触发的景点切换
}

export function GuideCenter({ onStateChange, externalSpot }: CenterProps) {
  const { spots: realSpots } = useSpots()
  const [spot, setSpot] = useState('dafo')
  const [spotsOpen, setSpotsOpen] = useState(false)
  const [duration, setDuration] = useState('quick')
  const [style, setStyle] = useState('history')
  const [tone, setTone] = useState('guide')
  const [playing, setPlaying] = useState(false)
  const [ttsLoading, setTtsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState('00:00')
  const [guideText, setGuideText] = useState('')        // LLM 生成的讲解文本
  const [textGenerating, setTextGenerating] = useState(false)
  const [lastStyle, setLastStyle] = useState('')
  const [lastDuration, setLastDuration] = useState('')
  const [lastTone, setLastTone] = useState('')
  const [volume, setVolume] = useState(0.8)
  const [showVolume, setShowVolume] = useState(false)
  const [voice, setVoice] = useState('mimo_default')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioReady, setAudioReady] = useState(false)

  const VOICES = { '默认女声': 'mimo_default', '冰糖': '冰糖', '茉莉': '茉莉', '苏打(男)': '苏打' }

  // 景点名 → 配图映射（16张 LS-*.jpg + API别名）
  const SPOT_IMAGES: Record<string, string> = {
    '灵山大照壁': '/LS-001.jpg', '五明桥': '/LS-002.jpg', '佛足坛': '/LS-003.jpg',
    '五智门': '/LS-004.jpg', '山门殿': '/LS-004.jpg',
    '菩提大道': '/LS-005.jpg', '九龙灌浴': '/LS-006.jpg',
    '降魔浮雕': '/LS-007.jpg', '阿育王柱': '/LS-008.jpg',
    '百子戏弥勒': '/LS-009.jpg', '弥勒戏沙图': '/LS-009.jpg',
    '祥符禅寺': '/LS-010.jpg', '灵山大佛': '/LS-011.jpg',
    '佛教文化博览馆': '/LS-012.jpg', '佛教文化博物馆': '/LS-012.jpg',
    '灵山梵宫': '/LS-013.jpg', '五印坛城': '/LS-014.jpg',
    '曼飞龙塔': '/LS-015.jpg', '曼荼罗塔': '/LS-015.jpg',
    '无尽意斋': '/LS-016.jpg',
    // 拈花湾
    '拈花广场': '/NH-001.jpg', '四季花海': '/NH-002.jpg', '梵天花海': '/NH-002.jpg',
    '禅意商街': '/NH-003.jpg', '香月花街': '/NH-003.jpg',
    '拈花堂': '/NH-004.jpg',
  }
  // 基础景点（始终优先展示，带配图）
  const BASE_SPOTS = [
    { key: 'LS-011', name: '灵山大佛', image: '/LS-011.jpg' },  // 第一位
    { key: 'LS-002', name: '五明桥', image: '/LS-002.jpg' },
    { key: 'LS-003', name: '佛足坛', image: '/LS-003.jpg' },
    { key: 'LS-005', name: '菩提大道', image: '/LS-005.jpg' },
    { key: 'LS-006', name: '九龙灌浴', image: '/LS-006.jpg' },
    { key: 'LS-011', name: '灵山大佛', image: '/LS-011.jpg' },
    { key: 'LS-013', name: '灵山梵宫', image: '/LS-013.jpg' },
    { key: 'LS-014', name: '五印坛城', image: '/LS-014.jpg' },
    { key: 'LS-010', name: '祥符禅寺', image: '/LS-010.jpg' },
    { key: 'LS-008', name: '阿育王柱', image: '/LS-008.jpg' },
    { key: 'LS-007', name: '降魔浮雕', image: '/LS-007.jpg' },
    { key: 'LS-009', name: '百子戏弥勒', image: '/LS-009.jpg' },
    { key: 'LS-004', name: '五智门', image: '/LS-004.jpg' },
    { key: 'LS-012', name: '佛教文化博览馆', image: '/LS-012.jpg' },
    { key: 'LS-015', name: '曼飞龙塔', image: '/LS-015.jpg' },
    { key: 'LS-016', name: '无尽意斋', image: '/LS-016.jpg' },
    { key: 'NH-001', name: '拈花广场', image: '/NH-001.jpg' },
    { key: 'NH-002', name: '四季花海', image: '/NH-002.jpg' },
    { key: 'NH-003', name: '禅意商街', image: '/NH-003.jpg' },
    { key: 'NH-004', name: '拈花堂', image: '/NH-004.jpg' },
  ]
  // 基础16个 + API中不重复的新景点（用文字占位图）
  const knownNames = new Set(Object.keys(SPOT_IMAGES))
  const apiExtras = realSpots
    .filter(s => !knownNames.has(s.spot_name))
    .map(s => ({ key: s.spot_id || s.spot_name, name: s.spot_name, image: '' }))
  // 去重：按 key 去重，保证每个 key 只出现一次
  const seenKeys = new Set<string>()
  const displaySpots = [...BASE_SPOTS, ...apiExtras].filter(s => {
    if (seenKeys.has(s.key)) return false
    seenKeys.add(s.key)
    return true
  })

  const activeSpot = realSpots.find(s => s.spot_name === (displaySpots.find(d => d.key === spot)?.name))
  const spotName = displaySpots.find(d => d.key === spot)?.name || '灵山大佛'

  // 同步状态到父组件
  useEffect(() => {
    onStateChange?.({ spot: spotName, style, duration, playing })
  }, [spotName, style, duration, playing])

  // 检测样式/时长变化，提示重新生成
  const styleChanged = (lastStyle && lastStyle !== style) || (lastDuration && lastDuration !== duration) || (lastTone && lastTone !== tone)

  // Agent 生成讲解文本（RAG + Neo4j 知识图谱增强）
  async function generateGuideText() {
    setTextGenerating(true)
    const raw = activeSpot?.detail_intro || activeSpot?.cultural_meaning || ''
    const styleLabels: Record<string, string> = {
      history: '从历史文化角度，结合相关历史背景和人物故事',
      folklore: '用生动有趣的民间故事和传说方式',
      architecture: '从建筑特色、设计美学和工艺技术角度',
      family: '用小朋友能听懂的简单语言，适合亲子游览',
    }
    const durLabels: Record<string, string> = { quick: '约100字', standard: '约400字', deep: '约800字' }
    const toneLabels: Record<string, string> = {
      guide: '以景区专业导游的口吻，正式、全面',
      friend: '以好朋友的口吻，随和、口语化、亲切自然',
      elder: '以博学长者的口吻，娓娓道来、引经据典、有故事感',
    }

    // 通过 Agent API
    const question = `请${styleLabels[style] || ''}介绍「${spotName}」。${toneLabels[tone] || ''}。字数${durLabels[duration] || '约400字'}。请使用你的知识检索工具和知识图谱查询工具获取全面信息（包括RAG知识库、Neo4j图谱中的邻近景点、历史人物、文化概念），然后生成一段讲解词。直接输出讲解词，不要加前缀说明。`

    let text = ''
    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: 'guide_center', message: question }),
      })
      // 从 SSE 流中提取最终回答
      const reader = resp.body?.getReader()
      if (reader) {
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const d = JSON.parse(line.slice(6))
                if (d.answer) text = d.answer
              } catch {}
            }
          }
        }
      }
    } catch {}
    if (!text) text = raw.length > 30 ? raw.slice(0, 500) : `${spotName}是灵山胜境的重要景点。`
    setGuideText(text)
    setLastStyle(style)
    setLastDuration(duration)
    setLastTone(tone)
    setTextGenerating(false)
    preGenerateAudio(text)
    return text
  }

  // 预生成 TTS 音频（讲解词生成完后立即调用）
  async function preGenerateAudio(text: string) {
    setAudioReady(false)
    try {
      const data = await ttsSynthesize(text, voice)
      const b64 = data?.audio_base64
      if (b64) {
        const audio = new Audio(`data:audio/${data.format || 'wav'};base64,${b64}`)
        audio.ontimeupdate = () => { if (audio.duration) { setProgress((audio.currentTime / audio.duration) * 100); setCurrentTime(`${Math.floor(audio.currentTime / 60)}:${String(Math.floor(audio.currentTime % 60)).padStart(2, '0')}`) } }
        audio.onended = () => { setPlaying(false); setProgress(0); setCurrentTime('00:00') }
        audio.onplay = () => setPlaying(true)
        audio.onpause = () => setPlaying(false)
        audioRef.current = audio
        setAudioReady(true)
      }
    } catch {}
  }

  // 响应外部景点切换（右侧面板点击）
  useEffect(() => {
    if (externalSpot) {
      const match = displaySpots.find(s => s.name === externalSpot)
      if (match) setSpot(match.key)
    }
  }, [externalSpot])

  // 首次加载或切换景点时自动生成
  useEffect(() => {
    setGuideText('')
    setLastStyle('')
    setLastDuration('')
    generateGuideText()
  }, [spot, style, duration, tone])

  // TTS 播放
  async function handlePlayPause() {
    if (playing) { audioRef.current?.pause(); setPlaying(false); return }
    // 已有预生成音频，直接播放
    if (audioRef.current && audioReady) { audioRef.current.play(); return }
    // 音频已加载但暂停中
    if (audioRef.current && audioRef.current.paused) { audioRef.current.play(); return }
    // 没有预生成音频，现场生成
    setTtsLoading(true)
    const text = guideText || await generateGuideText()
    if (!audioRef.current) await preGenerateAudio(text)
    if (audioRef.current) audioRef.current.play()
    setTtsLoading(false)
  }

  function handleRestart() {
    if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); setPlaying(true); setProgress(0) }
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <div>
        <h2 className="inline-block border-b-2 border-primary pb-1 text-2xl font-bold text-foreground">景点讲解</h2>
        <p className="mt-2 text-sm text-muted-foreground">选择您感兴趣的景点，获取多风格、多时长的智能讲解体验</p>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-xl shadow-[0_6px_18px_rgb(80,120,200,0.18)]">
        <img src="/guide-banner.png" alt="灵山胜境风光" className="h-24 w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.9_0.06_255)] via-[oklch(0.92_0.05_255)]/70 to-transparent" />
        <div className="absolute inset-y-0 left-0 flex flex-col justify-center p-5">
          <h3 className="text-lg font-bold text-slate-800 text-balance">沉浸聆听景点故事</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-600 text-pretty">选择您感兴趣的景点，获取多风格、多时长的智能讲解体验</p>
        </div>
      </div>

      {/* Spot selector */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">选择景点</p>
          <button type="button" onClick={() => setSpotsOpen((v) => !v)} aria-expanded={spotsOpen}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary">
            {spotsOpen ? '收起' : '查看全部'}
            <ChevronDown className={cn('size-4 transition-transform', spotsOpen && 'rotate-180')} />
          </button>
        </div>
        <div className="relative mt-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {displaySpots.slice(0, 4).map((s) => (
              <SpotCard key={s.key} s={s} isActive={s.key === spot} onSelect={() => setSpot(s.key)} />
            ))}
          </div>
          {spotsOpen && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-border bg-white p-2 shadow-[0_16px_40px_rgb(80,120,200,0.22)]">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {displaySpots.map((s) => (
                  <SpotCard key={s.key} s={s} isActive={s.key === spot} onSelect={() => { setSpot(s.key); setSpotsOpen(false) }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guide settings */}
      <div className="mt-4">
        <p className="text-sm font-semibold text-foreground">讲解设置</p>
        <div className="mt-2 grid gap-3 lg:grid-cols-3">
          <OptionGroup title="讲解时长" options={guideDurations} activeKey={duration} onSelect={setDuration} />
          <OptionGroup title="讲解风格" options={guideStyles} activeKey={style} onSelect={setStyle} />
          <OptionGroup title="讲者口吻" options={guideTones} activeKey={tone} onSelect={setTone} />
        </div>
      </div>

      {/* Current guide card */}
      <div className="mt-4 rounded-2xl border border-white/60 bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.10)]">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">当前讲解：{spotName}</h3>
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${playing ? 'bg-primary/10 text-primary' : ttsLoading ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
            <Radio className="size-3.5" />
            {playing ? '正在讲解中' : ttsLoading ? '加载中...' : '已暂停'}
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-4 lg:flex-row">
          {SPOT_IMAGES[spotName] ? (
            <img src={SPOT_IMAGES[spotName]} alt={spotName} className="h-32 w-full shrink-0 rounded-lg object-cover lg:w-56" />
          ) : (
            <div className="h-32 w-full shrink-0 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center lg:w-56">
              <span className="text-4xl font-bold text-primary/30">{spotName.slice(0, 2)}</span>
            </div>
          )}
          <div className="flex flex-col gap-2 leading-relaxed text-foreground">
            <div className="max-h-40 overflow-y-auto rounded-lg bg-secondary/30 p-3">
              {guideText ? (
                <p className="text-sm whitespace-pre-wrap">{guideText}</p>
              ) : (
                <p className="text-sm text-muted-foreground animate-pulse">AI 正在为您准备讲解词...</p>
              )}
            </div>
            {styleChanged && (
              <button onClick={generateGuideText} disabled={textGenerating}
                className="self-start text-xs text-primary hover:underline disabled:opacity-50">
                {textGenerating ? '生成中...' : '🔄 讲解设置已改变，点击重新生成讲解'}
              </button>
            )}
            {textGenerating && <span className="text-xs text-muted-foreground">AI 正在生成讲解词...</span>}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button type="button" aria-label={playing ? '暂停' : '播放'} onClick={handlePlayPause} disabled={ttsLoading}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_16px_rgb(80,120,200,0.28)] transition-colors hover:bg-primary/90 disabled:opacity-50">
            {ttsLoading ? <Loader2 className="size-5 animate-spin" /> : playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>
          <button type="button" aria-label="重播" onClick={handleRestart}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary">
            <RotateCcw className="size-4" />
          </button>
          <div className="relative h-1.5 flex-1 rounded-full bg-secondary">
            <div className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{playing || progress > 0 ? currentTime : '--:--'}</span>
          {/* 音量 */}
          <div className="relative">
            <button type="button" onClick={() => setShowVolume(v => !v)}
              className="flex size-5 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground">
              <Volume2 className="size-5" />
            </button>
            {showVolume && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-xl border border-border bg-white p-2 shadow-lg">
                <input type="range" min="0" max="1" step="0.1" value={volume}
                  onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); if (audioRef.current) audioRef.current.volume = v }}
                  className="h-1 w-20 accent-primary" />
              </div>
            )}
          </div>
          {/* 声色切换 */}
          <select value={voice} onChange={(e) => setVoice(e.target.value)}
            className="shrink-0 rounded border border-border bg-white text-[10px] text-muted-foreground">
            {Object.entries(VOICES).map(([k, v]) => <option key={v} value={v}>{k}</option>)}
          </select>
          {/* 数字人讲解 — 播放/停止切换 */}
          {guideText && (
            <button type="button" onClick={() => {
              if (ttsIsSpeaking()) { ttsStop(); return }
              ttsSpeak(guideText)
            }}
              className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary hover:bg-primary/20">
              🎙 数字人讲
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setStyle('family')}
            className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
            <Baby className="size-4 text-primary" />切换亲子讲解
          </button>
          <button type="button" onClick={() => { const keys = displaySpots.map(s => s.key); const idx = keys.indexOf(spot); if (idx < keys.length - 1) setSpot(keys[idx + 1]) }}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_6px_16px_rgb(80,120,200,0.28)] transition-colors hover:bg-primary/90">
            继续讲下一个景点<ChevronRight className="size-4" />
          </button>
          <button type="button" onClick={() => window.open('/qa', '_self')}
            className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
            <BookMarked className="size-4 text-primary" />去智能问答
          </button>
        </div>
      </div>
    </section>
  )
}
