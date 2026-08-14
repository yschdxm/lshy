'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, VolumeX, Volume2, RefreshCw } from 'lucide-react'

// 讯飞数字人凭证由后端签名接口下发（apiSecret 不进浏览器）
import { getXfyunAuth } from '@/lib/api'

// 默认兜底配置
const FALLBACK_CHARACTERS = {
  female: { avatar_id: '111322001', vcn: 'x4_lingxiaoyu_assist', label: '舒窈·女声' },
  male:   { avatar_id: '111140001', vcn: 'x4_lingfeizhe_oral', label: '风屿·男声' },
}

// 全局状态同步
const STATUS_SYNC_KEY = '__avatar_status'
if (typeof window !== 'undefined' && !(window as any)[STATUS_SYNC_KEY]) {
  (window as any)[STATUS_SYNC_KEY] = 'idle'
}

// Props
interface Props {
  onReady?: () => void
  onError?: (msg: string) => void
  message?: string
}

export function XfyunAvatar({ onReady, onError, message }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<any>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [muted, setMuted] = useState(false)
  const [gender, setGender] = useState<'female' | 'male'>('female')
  const [status, setStatus] = useState('idle')
  const [bubbleText, setBubbleText] = useState('您好，我是您的AI导游')
  // 从管理端加载的活动配置
  const [activeConfig, setActiveConfig] = useState<{avatar_id: string; vcn: string; gender: string; voice_name: string} | null>(null)
  const [configLoaded, setConfigLoaded] = useState(false)

  // 加载管理员端配置的活动数字人
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/digital-human/active`)
      .then(r => r.json())
      .then(c => {
        if (c.avatar_id) {
          setActiveConfig({ avatar_id: c.avatar_id, vcn: c.vcn, gender: c.gender || '女', voice_name: c.voice_name || '' })
          setBubbleText(c.greeting_text || '您好，我是您的AI导游')
          setGender(c.gender === '男' ? 'male' : 'female')
        }
      })
      .catch(() => {})
      .finally(() => setConfigLoaded(true))
  }, [])

  // 监听全局状态同步事件
  useEffect(() => {
    function onSync(e: any) {
      if (e.detail?.status) setStatus(e.detail.status)
      if (e.detail?.bubble) setBubbleText(e.detail.bubble)
    }
    window.addEventListener('avatar-status', onSync)
    return () => window.removeEventListener('avatar-status', onSync)
  }, [])

  // 播报状态 action — 说话时自动加手势
  useEffect(() => {
    if (!avatarRef.current || !connected) return
    if (status === 'speaking') {
      avatarRef.current.writeCmd('action', 'A_RH_hello_O').catch(() => {})
    }
  }, [status, connected])

  // ---- 初始化 ----
  useEffect(() => {
    let destroyed = false

    async function init() {
      try {
        const importFn = new Function('path', 'return import(path)')
        const mod = await importFn('/sdk/esm/index.js')
        const AvatarPlatform = mod.default || mod.AvatarPlatform
        const { SDKEvents, PlayerEvents } = mod

        if (destroyed) return
        const avatar = new AvatarPlatform()

        avatar.on(SDKEvents.connected, () => {
          if (!destroyed) { setConnected(true); setLoading(false); setStatus('idle'); onReady?.() }
        })
        avatar.on(SDKEvents.error, (e: any) => {
          const msg = e?.message || '连接失败'
          if (!destroyed) { setError(msg); setLoading(false); onError?.(msg) }
        })
        avatar.on(SDKEvents.disconnected, (e: any) => {
          if (e && !destroyed) setError('连接断开')
        })
        // 说话起止
        avatar.on(SDKEvents.frame_start, () => setStatus('speaking'))
        avatar.on(SDKEvents.frame_stop, () => setStatus('idle'))

        const player = avatar.player || avatar.createPlayer()
        player.on(PlayerEvents.playNotAllowed, () => {
          document.addEventListener('click', () => avatar.player?.resume(), { once: true })
        })

        // 从后端获取临时签名 URL（约5分钟有效），SDK 检测到 authorization= 会直接使用，不再本地签名
        const auth = await getXfyunAuth()
        if (destroyed) return
        avatar.setApiInfo({
          serverUrl: auth.server_url,
          appId: auth.app_id,
          apiKey: '',
          apiSecret: '',
          sceneId: auth.scene_id,
        })
        const char = activeConfig || FALLBACK_CHARACTERS[gender]
        avatar.setGlobalParams({
          stream: { protocol: 'xrtc', alpha: 1 },
          avatar: { avatar_id: char.avatar_id, width: 720, height: 1280, scale: 0.9 },
          tts: { vcn: char.vcn },
          air: { air: 1, add_nonsemantic: 1 },
        })

        await avatar.start({ wrapper: wrapperRef.current! })
        avatarRef.current = avatar
      } catch (e: any) {
        if (!destroyed) {
          setError(e?.message || 'SDK 初始化失败')
          setLoading(false)
          onError?.(e?.message || 'SDK 初始化失败')
        }
      }
    }

    if (configLoaded) init()
    return () => { destroyed = true; avatarRef.current?.destroy() }
  }, [gender, configLoaded])

  // ---- 公开方法 ----
  const speak = useCallback(async (text: string) => {
    // 等待连接就绪（最长 8 秒）
    for (let i = 0; i < 40; i++) {
      if (avatarRef.current && connected) break
      await new Promise((r) => setTimeout(r, 200))
    }
    if (!avatarRef.current || !connected) return
    try {
      setStatus('speaking')
      ;(window as any).__xfyunLastText = text
      ;(window as any).__xfyunPaused = false
      await avatarRef.current.writeText(text, { nlp: false })
    } catch {}
  }, [connected])

  const mute = useCallback((v: boolean) => {
    if (avatarRef.current?.player) {
      avatarRef.current.player.muted = v
      setMuted(v)
    }
  }, [])

  const switchGender = useCallback((g: 'female' | 'male') => {
    if (g === gender) return
    avatarRef.current?.destroy()
    avatarRef.current = null
    setConnected(false)
    setLoading(true)
    setError('')
    setGender(g)
  }, [gender])

  // 停止说话
  const stopSpeaking = useCallback(async () => {
    if (!avatarRef.current || !connected) return
    try {
      await avatarRef.current.interrupt()
      ;(window as any).__xfyunPaused = true
      setStatus('idle')
    } catch {}
  }, [connected])

  // 暴露到 window
  useEffect(() => {
    (window as any).__xfyunSpeak = speak
    ;(window as any).__xfyunStop = stopSpeaking
  }, [speak, stopSpeaking])

  // 暴露就绪状态
  useEffect(() => {
    (window as any).__xfyunReady = connected
    return () => { delete (window as any).__xfyunReady }
  }, [connected])

  const STATUS_LABELS: Record<string, string> = {
    idle: '在线', thinking: '思考中...', speaking: '讲解中...', listening: '倾听中...',
  }

  return (
    <div className="flex flex-col h-full">
      {/* 视频区：550px × 1.35 ≈ 740px 视觉高度，不裁剪 */}
      <div className="w-full relative overflow-visible" style={{ height: '550px' }}>
        <div className="h-[550px] w-full relative" style={{ transform: 'scale(1.35)', transformOrigin: 'center top' }}>
          {/* 气泡 — 底线锚定，内容向上增长 */}
          <div className="absolute left-1/2 z-20 w-48 rounded-lg border border-white/60 bg-card/80 px-2 py-1 text-[10px] leading-snug text-foreground shadow-[0_3px_10px_rgb(80,120,200,0.08)] backdrop-blur-md" style={{ bottom: 'calc(100% - 75px)', transform: 'translateX(-50%)' }}>
            {message || bubbleText || '您好，我是您的AI导游'}
          </div>
          <div ref={wrapperRef} className="absolute inset-0 h-full w-full bg-transparent" />
        </div>
      </div>

      {/* 加载/错误遮罩 */}
      {(loading || error) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 rounded-2xl">
          {loading && !error && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-8 animate-spin text-primary" />
              <span className="text-sm text-white/80">数字人加载中...</span>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center gap-2 px-4 text-center">
              <span className="text-sm text-red-400">{error}</span>
              <button onClick={() => { setError(''); setLoading(true); switchGender(gender) }}
                className="rounded-lg bg-white/20 px-3 py-1 text-xs text-white">
                <RefreshCw className="mr-1 inline size-3" />重试
              </button>
            </div>
          )}
        </div>
      )}

      {/* 状态卡 */}
      {connected && (
        <div className="shrink-0 mt-[50px] mx-2 mb-2 flex items-center gap-3 rounded-2xl border border-white/60 bg-card/70 px-4 py-3 shadow-[0_8px_24px_rgb(80,120,200,0.12)] backdrop-blur-md">
          <button type="button" onClick={() => mute(!muted)} aria-label="语音"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/60 bg-card/70 shadow-[0_6px_16px_rgb(80,120,200,0.16)] backdrop-blur-md text-primary hover:bg-card">
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>当前状态：</span>
            </div>
            <p className="mt-1 font-semibold text-sm text-foreground">{STATUS_LABELS[status] || '在线'}</p>
            {status === 'listening' && (
              <div className="mt-2 flex items-end gap-0.5">
                {[6,10,16,22,14,8,18,24,12,7,15,20,10,6,14].map((h,i) => (
                  <span key={i} className="w-1 rounded-full bg-primary/70 animate-pulse" style={{ height: `${h}px`, animationDelay: `${i*0.06}s` }} />
                ))}
              </div>
            )}
          </div>
          {/* 性别切换 */}
          <button onClick={() => switchGender(gender === 'female' ? 'male' : 'female')}
            className="shrink-0 rounded-full border border-white/60 bg-card/70 px-3 py-1.5 text-xs text-foreground backdrop-blur-md hover:bg-card">
            {gender === 'female' ? '♀' : '♂'}
          </button>
        </div>
      )}

    </div>
  )
}
