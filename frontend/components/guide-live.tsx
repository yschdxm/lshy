'use client'

import { useState, useRef } from 'react'
import { Play, Pause, Loader2 } from 'lucide-react'
import { useSpots } from '@/lib/data-adapter'

// TTS 由后端代理（密钥仅存服务端）
import { ttsSynthesize } from '@/lib/api'

const VOICES = { '默认女声': 'mimo_default', '冰糖': '冰糖', '茉莉': '茉莉', '苏打(男)': '苏打' }

export function GuideLive() {
  const { spots, loading } = useSpots()
  const [selectedSpot, setSelectedSpot] = useState('')
  const [playing, setPlaying] = useState(false)
  const [ttsLoading, setTtsLoading] = useState(false)
  const [voice, setVoice] = useState('mimo_default')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function handlePlay(spotName: string, spotIntro?: string) {
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
      return
    }
    setTtsLoading(true)
    setSelectedSpot(spotName)
    const text = spotIntro || `欢迎来到${spotName}。这里是灵山胜境的重要景点之一。`
    try {
      const data = await ttsSynthesize(text, voice)
      const b64 = data?.audio_base64
      if (b64) {
        if (audioRef.current) { audioRef.current.pause() }
        const audio = new Audio(`data:audio/${data.format || 'wav'};base64,${b64}`)
        audio.onended = () => setPlaying(false)
        audio.onplay = () => setPlaying(true)
        audioRef.current = audio
        await audio.play()
      }
    } catch {} finally { setTtsLoading(false) }
  }

  if (loading) return <p className="text-sm text-muted-foreground py-4">加载景点数据...</p>

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">声音：</span>
        <select value={voice} onChange={(e) => setVoice(e.target.value)}
          className="rounded-lg border border-border bg-white px-2 py-1 text-xs">
          {Object.entries(VOICES).map(([k, v]) => <option key={v} value={v}>{k}</option>)}
        </select>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {spots.slice(0, 8).map((s) => {
          const isActive = selectedSpot === s.spot_name && playing
          const isLoading = selectedSpot === s.spot_name && ttsLoading
          return (
            <button
              key={s.spot_id}
              type="button"
              onClick={() => handlePlay(s.spot_name, s.detail_intro || s.highlights)}
              disabled={ttsLoading}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${isActive ? 'border-primary bg-primary/5' : 'border-border bg-white hover:bg-secondary'}`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg">🏯</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{s.spot_name}</p>
                <p className="truncate text-xs text-muted-foreground">{s.recommended_duration || 30}分钟</p>
              </div>
              {isLoading ? <Loader2 className="size-5 animate-spin text-primary shrink-0" />
               : isActive ? <Pause className="size-5 text-primary shrink-0" />
               : <Play className="size-5 text-muted-foreground shrink-0" />}
            </button>
          )
        })}
      </div>
      <audio ref={audioRef} className="hidden" />
    </div>
  )
}
