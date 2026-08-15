'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, VolumeX, Volume2, RefreshCw, Moon, Venus, Mars } from 'lucide-react'

// 讯飞数字人凭证由后端签名接口下发（apiSecret 不进浏览器）
import { getXfyunAuth } from '@/lib/api'

// 默认兜底配置（avatar_id 以讯飞交互平台"形象列表"中已授权的为准；
// vcn 留空表示使用该形象在平台配置的默认发音人）
const FALLBACK_CHARACTERS = {
  female: { avatar_id: '111322001', vcn: 'x4_lingxiaoyue_oral', label: '舒窈·唐装女生' },
  male:   { avatar_id: '111141001', vcn: '', label: '风晏' },
}

// 全局状态同步
const STATUS_SYNC_KEY = '__avatar_status'
if (typeof window !== 'undefined' && !(window as any)[STATUS_SYNC_KEY]) {
  (window as any)[STATUS_SYNC_KEY] = 'idle'
}

// 讯飞错误对象：message + code（error 事件与 start() reject 都会抛出）
// 常见错误码：11200 形象/发音人未授权或交互时长用完；11203 并发路数超限
const XFYUN_ERROR_HINTS: Record<string, string> = {
  '11200': '（形象/发音人未授权，或交互时长已用完，请到讯飞交互平台检查）',
  '11203': '（并发路数超限，请到交互平台-交互日志终止“持续中”的会话）',
  '10313': '（appId 与 apiKey 不匹配，检查后端 .env 是否来自同一个接口服务）',
}
function formatXfyunError(e: any): string {
  console.error('[xfyun-avatar] error event:', e)  // 完整对象进控制台，便于排查
  const code = e?.code != null ? String(e.code) : ''
  const msg = e?.message || '连接失败'
  return `${code ? `[${code}] ` : ''}${msg}${XFYUN_ERROR_HINTS[code] || ''}`
}

/** 性别字段归一化：DB/管理端可能存 '男'/'女'、'M'/'F'、'male'/'female' */
function parseGender(v?: string | null): 'female' | 'male' {
  return v === '男' || v === 'M' || v === 'm' || v === 'male' ? 'male' : 'female'
}

// ============================================================
// 全局单例：SDK 实例与 WebSocket 连接跨页面存活
// 页面组件只负责“挂载/卸载 DOM 容器”，不做连接生命周期管理
// ============================================================
interface XfyunGlobal {
  avatar: any
  stage: HTMLDivElement          // 传给 SDK start() 的持久容器，随页面切换被重新挂载
  connected: boolean
  error: string
  gender: 'female' | 'male'
  configKey: string              // avatar_id|vcn|gender，变化时重建
  muted: boolean
  sleeping: boolean              // 空闲超时后已断开（休眠中）
}

let G: XfyunGlobal | null = null
let initPromise: Promise<void> | null = null
let userMutedExplicit = false    // 用户主动点过静音后，不再自动取消静音
let pointerListenerBound = false

// 数字人配置列表缓存：休眠头像要按 avatar_id 匹配各形象自己的 image_url
interface DhConfig { avatar_id?: string; image_url?: string }
let configsCache: DhConfig[] | null = null
let configsPromise: Promise<DhConfig[]> | null = null
function fetchDhConfigs(): Promise<DhConfig[]> {
  if (configsCache) return Promise.resolve(configsCache)
  if (!configsPromise) {
    configsPromise = fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/digital-human?page_size=100`)
      .then(r => r.json())
      .then(d => { configsCache = d.items || []; return configsCache! })
      .catch(() => [])
      .finally(() => { configsPromise = null })
  }
  return configsPromise
}

/** 向所有已挂载的数字人组件广播 SDK 事件 */
function emitSdk(type: string, detail?: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent('xfyun-sdk', { detail: { type, ...detail } }))
}

// ---- 空闲休眠：3 分钟无活动自动断开（释放服务端路数与试用时长）----
const IDLE_TIMEOUT_MS = 3 * 60 * 1000
let idleTimer: ReturnType<typeof setTimeout> | null = null

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer)
  if (!G?.connected || G.sleeping) return
  idleTimer = setTimeout(() => { enterSleep() }, IDLE_TIMEOUT_MS)
}

/** 进入休眠：断开连接释放服务端路数（实例保留，唤醒时可复用 start()）。
 *  注意：不做视频截帧 —— xrtc 是 alpha 透明流，canvas 只能拿到 RGB 平面（绿幕/黑影） */
function enterSleep() {
  if (!G || G.sleeping) return
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null }
  G.sleeping = true
  G.connected = false
  ;(window as any).__xfyunReady = false
  try { G.avatar?.stop() } catch {}   // 优雅断连，释放服务端路数
  emitSdk('sleep')
}

/** 唤醒：重新签名（旧 URL 5 分钟过期）后复用实例重新 start */
async function wakeUp() {
  if (!G || !G.sleeping) return
  G.sleeping = false
  emitSdk('waking')
  try {
    const auth = await getXfyunAuth()
    G.avatar.setApiInfo({
      serverUrl: 'wss://avatar.cn-huadong-1.xf-yun.com/v1/interact',
      appId: auth.app_id,
      apiKey: '',
      apiSecret: '',
      sceneId: auth.scene_id,
      signedUrl: auth.server_url,
    })
    await G.avatar.start({ wrapper: G.stage })  // connected 事件会重置界面与空闲计时
  } catch (e: any) {
    const msg = formatXfyunError(e)
    G.error = msg
    G.sleeping = true   // 回到休眠界面，可再次尝试
    emitSdk('wake-failed', { message: msg })
  }
}

async function initGlobal(char: { avatar_id: string; vcn: string }, gender: 'female' | 'male'): Promise<void> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    const importFn = new Function('path', 'return import(path)')
    const mod = await importFn('/sdk/esm/index.js')
    const AvatarPlatform = mod.default || mod.AvatarPlatform
    const { SDKEvents, PlayerEvents } = mod

    const avatar = new AvatarPlatform()
    const stage = document.createElement('div')
    stage.className = 'absolute inset-0 h-full w-full bg-transparent'

    const key = `${char.avatar_id}|${char.vcn}|${gender}`
    G = { avatar, stage, connected: false, error: '', gender, configKey: key, muted: false, sleeping: false }

    // 事件只注册一次，状态写入全局并通过 window 事件广播给各页面组件
    avatar.on(SDKEvents.connected, () => {
      if (!G) return
      G.connected = true
      G.error = ''
      G.sleeping = false
      ;(window as any).__xfyunReady = true
      // connected 后 xrtc 客户端才真正存在：此时设 muted 才会调用 muteAudio()
      // （start 前设置只写标志位，<audio> 仍会带声自动播放被浏览器拒绝）
      try {
        if (G.avatar.player) { G.avatar.player.muted = true; G.muted = true }
      } catch {}
      emitSdk('connected')
      emitSdk('muted', { muted: true })
      resetIdleTimer()
    })
    avatar.on(SDKEvents.error, (e: any) => {
      if (!G) return
      G.error = formatXfyunError(e)
      G.connected = false
      ;(window as any).__xfyunReady = false
      emitSdk('error', { message: G.error })
    })
    avatar.on(SDKEvents.disconnected, (e: any) => {
      // G 已被 teardown 置空说明是主动断开（切换/重试），不广播为错误
      if (e && G) emitSdk('disconnected')
    })
    // 播报起止既是状态同步点，也是“非空闲”信号
    avatar.on(SDKEvents.frame_start, () => { emitSdk('frame', { status: 'speaking' }); resetIdleTimer() })
    avatar.on(SDKEvents.frame_stop, () => { emitSdk('frame', { status: 'idle' }); resetIdleTimer() })

    const player = avatar.player || avatar.createPlayer()
    player.on(PlayerEvents.playNotAllowed, () => {
      document.addEventListener('click', () => avatar.player?.resume(), { once: true })
    })

    // 浏览器自动播放策略：先静音起播（无需用户交互，加载更快、不再报 play() 错误），
    // 首次点击页面时再取消静音（用户主动静音过的除外）
    player.muted = true
    G.muted = true
    if (!pointerListenerBound) {
      pointerListenerBound = true
      document.addEventListener('pointerdown', () => {
        resetIdleTimer()  // 页面上有任何操作都算“非空闲”
        if (G?.connected && !userMutedExplicit && G.avatar?.player?.muted) {
          G.avatar.player.muted = false
          G.muted = false
          emitSdk('muted', { muted: false })
        }
      })
    }

    // 从后端获取临时签名 URL（约5分钟有效），apiSecret 不进浏览器
    const auth = await getXfyunAuth()
    // 安全接入（官方文档 17.2）：仅传 appId / sceneId / signedUrl，
    // SDK 优先使用 signedUrl 直连，不在本地签名
    avatar.setApiInfo({
      serverUrl: 'wss://avatar.cn-huadong-1.xf-yun.com/v1/interact',
      appId: auth.app_id,
      apiKey: '',
      apiSecret: '',
      sceneId: auth.scene_id,
      signedUrl: auth.server_url,
    })
    avatar.setGlobalParams({
      stream: { protocol: 'xrtc', alpha: 1 },
      avatar: { avatar_id: char.avatar_id, width: 720, height: 1280, scale: 0.9 },
      tts: { vcn: char.vcn },
      air: { air: 1, add_nonsemantic: 1 },
    })

    await avatar.start({ wrapper: stage })
  })()
  try {
    await initPromise
  } catch (e) {
    initPromise = null  // 失败允许重试
    throw e
  }
}

/** 销毁全局连接（切换形象/性别/出错重试时调用） */
function teardownGlobal() {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null }
  if (G) {
    try { G.avatar?.stop() } catch {}   // 先 stop 优雅断连，释放服务端路数
    try { G.avatar?.destroy() } catch {}
  }
  G = null
  initPromise = null
  if (typeof window !== 'undefined') (window as any).__xfyunReady = false
}

// Props
interface Props {
  onReady?: () => void
  onError?: (msg: string) => void
  message?: string
}

export function XfyunAvatar({ onReady, onError, message }: Props) {
  // 初始状态直接取全局单例快照：已有连接时首帧就是“已连接”，不闪“加载中”
  const [connected, setConnected] = useState(() => !!G?.connected)
  const [loading, setLoading] = useState(() => (G ? !G.connected && !G.error && !G.sleeping : true))
  const [error, setError] = useState(() => G?.error || '')
  const [muted, setMuted] = useState(() => !!G?.muted)
  const [gender, setGender] = useState<'female' | 'male'>(() => G?.gender || 'female')
  const [status, setStatus] = useState('idle')
  const [sleeping, setSleeping] = useState(() => !!G?.sleeping)
  const [bubbleText, setBubbleText] = useState('您好，我是您的AI导游')
  // 从管理端加载的活动配置（image_url 用作休眠时的静态背景）
  const [activeConfig, setActiveConfig] = useState<{avatar_id: string; vcn: string; gender: string; voice_name: string; image_url?: string} | null>(null)
  const [allConfigs, setAllConfigs] = useState<DhConfig[]>(configsCache || [])
  const [configLoaded, setConfigLoaded] = useState(false)
  const [retryTick, setRetryTick] = useState(0)

  // 加载全部数字人配置（用于按 avatar_id 匹配各形象的头像）
  useEffect(() => {
    fetchDhConfigs().then(setAllConfigs)
  }, [])

  // ref 回调：DOM 节点创建的同一帧就把持久 stage 挂回来，
  // 不等配置接口/任何 await，切页时画面无空窗
  const wrapperEl = useRef<HTMLDivElement | null>(null)
  const setWrapperRef = useCallback((el: HTMLDivElement | null) => {
    wrapperEl.current = el
    if (el && G?.stage && G.stage.parentElement !== el) {
      el.appendChild(G.stage)
      try { G.avatar?.player?.resize() } catch {}
    }
  }, [])

  // 加载管理员端配置的活动数字人
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/digital-human/active`)
      .then(r => r.json())
      .then(c => {
        if (c.avatar_id) {
          setActiveConfig({ avatar_id: c.avatar_id, vcn: c.vcn, gender: c.gender || '女', voice_name: c.voice_name || '', image_url: c.image_url || '' })
          setBubbleText(c.greeting_text || '您好，我是您的AI导游')
          // 用户手动切换过的性别优先于配置（localStorage 跨页面保留）
          const saved = localStorage.getItem('xfyun_gender')
          setGender(saved === 'male' || saved === 'female' ? saved : parseGender(c.gender))
        }
      })
      .catch(() => {})
      .finally(() => setConfigLoaded(true))
  }, [])

  // 订阅全局 SDK 事件（连接状态由单例维护，组件只同步展示）
  useEffect(() => {
    function onSdk(e: any) {
      const { type } = e.detail || {}
      if (type === 'connected') { setConnected(true); setLoading(false); setStatus('idle'); setError(''); setSleeping(false); onReady?.() }
      else if (type === 'error') { setError(e.detail.message || '连接失败'); setLoading(false); onError?.(e.detail.message) }
      else if (type === 'disconnected') { setError('连接断开') }
      else if (type === 'frame') { setStatus(e.detail.status) }
      else if (type === 'muted') { setMuted(e.detail.muted) }
      else if (type === 'sleep') { setSleeping(true); setConnected(false); setLoading(false); setStatus('idle') }
      else if (type === 'waking') { setSleeping(false); setLoading(true); setError('') }
      else if (type === 'wake-failed') { setSleeping(true); setLoading(false); setError(e.detail.message || '唤醒失败') }
    }
    window.addEventListener('xfyun-sdk', onSdk)
    return () => window.removeEventListener('xfyun-sdk', onSdk)
  }, [onReady, onError])

  // 监听全局状态同步事件（气泡文案等）
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
    if (!G?.avatar || !connected) return
    if (status === 'speaking') {
      G.avatar.writeCmd('action', 'A_RH_hello_O').catch(() => {})
    }
  }, [status, connected])

  // ---- 初始化 / 挂载 ----
  useEffect(() => {
    if (!configLoaded) return
    let cancelled = false

    async function mount() {
      // 形象的 avatar_id/vcn 来自管理端配置；但用户手动切换过性别且与配置形象不同时，
      // 使用对应性别的内置形象（否则切换按钮只是空转，avatar 永远是配置里那一个）
      const saved = localStorage.getItem('xfyun_gender')
      const configGender: 'female' | 'male' = parseGender(activeConfig?.gender)
      const userOverrode = (saved === 'male' || saved === 'female') && saved !== configGender
      const char = (activeConfig && !userOverrode)
        ? { avatar_id: activeConfig.avatar_id, vcn: activeConfig.vcn }
        : FALLBACK_CHARACTERS[gender]
      const key = `${char.avatar_id}|${char.vcn}|${gender}`

      // 配置或性别变化 → 重建全局连接
      if (G && G.configKey !== key) teardownGlobal()

      if (!G) {
        // 先同步“正在连接”的界面状态
        setLoading(true)
        setError('')
        try {
          await initGlobal(char, gender)
        } catch (e: any) {
          if (!cancelled) {
            const msg = formatXfyunError(e)
            const g = G as XfyunGlobal | null
            if (g) g.error = msg
            setError(msg)
            setLoading(false)
            onError?.(msg)
          }
          return
        }
      }

      if (cancelled || !G) return
      // 已有连接：同步全局快照到本组件
      setConnected(G.connected)
      setLoading(!G.connected && !G.error && !G.sleeping)
      setError(G.error)
      setMuted(G.muted)
      setSleeping(G.sleeping)
      if (G.connected) onReady?.()

      // 把持久 stage 挂到当前页面的容器里（初次连接完成后 stage 才存在）
      if (wrapperEl.current && G.stage.parentElement !== wrapperEl.current) {
        wrapperEl.current.appendChild(G.stage)
        try { G.avatar.player?.resize() } catch {}
      }
    }

    mount()
    // 卸载时只做视图分离：不 stop/destroy，连接留给下一个页面
    return () => { cancelled = true }
  }, [gender, configLoaded, retryTick])

  // ---- 公开方法 ----
  const speak = useCallback(async (text: string) => {
    // 等待连接就绪（最长 8 秒）
    for (let i = 0; i < 40; i++) {
      if (G?.connected) break
      await new Promise((r) => setTimeout(r, 200))
    }
    if (!G?.connected) return
    try {
      setStatus('speaking')
      resetIdleTimer()
      ;(window as any).__xfyunLastText = text
      ;(window as any).__xfyunPaused = false
      await G.avatar.writeText(text, { nlp: false })
    } catch {}
  }, [])

  const mute = useCallback((v: boolean) => {
    userMutedExplicit = true   // 用户主动静音/取消后，不再被自动取消静音覆盖
    if (G?.avatar?.player) {
      G.avatar.player.muted = v
      G.muted = v
      setMuted(v)
    }
  }, [])

  // 唤醒：复用实例重新连接
  const wake = useCallback(() => {
    setSleeping(false)
    setLoading(true)
    setError('')
    wakeUp()
  }, [])

  const switchGender = useCallback((g: 'female' | 'male') => {
    if (g === gender && G?.connected) return
    localStorage.setItem('xfyun_gender', g)
    teardownGlobal()
    setConnected(false)
    setLoading(true)
    setError('')
    setGender(g)
  }, [gender])

  // 出错重试：重建全局连接
  const reconnect = useCallback(() => {
    teardownGlobal()
    setConnected(false)
    setLoading(true)
    setError('')
    setRetryTick(t => t + 1)
  }, [])

  // 停止说话
  const stopSpeaking = useCallback(async () => {
    if (!G?.connected) return
    try {
      await G.avatar.interrupt()
      ;(window as any).__xfyunPaused = true
      setStatus('idle')
    } catch {}
  }, [])

  // 暴露到 window（供 tts-controller 等调用）
  useEffect(() => {
    (window as any).__xfyunSpeak = speak
    ;(window as any).__xfyunStop = stopSpeaking
  }, [speak, stopSpeaking])

  const STATUS_LABELS: Record<string, string> = {
    idle: '在线', thinking: '思考中...', speaking: '讲解中...', listening: '倾听中...',
  }

  // 休眠头像跟随当前实际连接的形象：
  // 先确定当前用的 avatar_id（管理端配置 or 手动切换的内置形象），
  // 再从配置列表里按 avatar_id 匹配该形象自己的 image_url
  const configGender = parseGender(activeConfig?.gender)
  const usingActiveConfig = !!activeConfig && gender === configGender
  const currentAvatarId = usingActiveConfig
    ? activeConfig!.avatar_id
    : FALLBACK_CHARACTERS[gender].avatar_id
  const sleepImage =
    allConfigs.find(c => c.avatar_id === currentAvatarId)?.image_url
    || (usingActiveConfig ? activeConfig?.image_url : '')
    || '/digital-human.png'

  return (
    <div className="flex flex-col h-full">
      {/* 视频区：550px × 1.35 ≈ 740px 视觉高度，不裁剪 */}
      <div className="w-full relative overflow-visible" style={{ height: '550px' }}>
        {/* pointer-events-none：1.35 倍缩放后视频的透明边缘会溢出到主窗口/状态卡，
            不禁用会挡住下方内容的点击；视频本身无需任何鼠标交互 */}
        <div className="pointer-events-none h-[550px] w-full relative" style={{ transform: 'scale(1.35)', transformOrigin: 'center top' }}>
          {/* 气泡 — 底线锚定，内容向上增长（休眠时不显示） */}
          {!sleeping && (
            <div className="absolute left-1/2 z-20 w-48 rounded-lg border border-white/60 bg-card/80 px-2 py-1 text-[10px] leading-snug text-foreground shadow-[0_3px_10px_rgb(80,120,200,0.08)] backdrop-blur-md" style={{ bottom: 'calc(100% - 75px)', transform: 'translateX(-50%)' }}>
              {message || bubbleText || '您好，我是您的AI导游'}
            </div>
          )}
          <div ref={setWrapperRef} className="absolute inset-0 h-full w-full bg-transparent" />
        </div>

        {/* 休眠遮罩：磨砂玻璃风格，与整站视觉一致（不用大图糊底）。
            放在 scale(1.35) 缩放层之外，尺寸严格等于数字人栏，不会溢出到主窗口 */}
        {sleeping && (
          <div className="absolute inset-2 z-30 flex flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border border-white/60 bg-white/40 shadow-[0_8px_30px_rgb(80,120,200,0.12)] backdrop-blur-xl">
            {/* 圆形头像 + 呼吸光晕 + zZ 标记 */}
            <div className="relative">
              <div className="absolute -inset-3 animate-ping rounded-full bg-primary/15" style={{ animationDuration: '2.5s' }} />
              <img src={sleepImage} alt="数字人休眠中"
                className="relative size-24 rounded-full border border-white/70 object-cover object-top opacity-90 shadow-[0_8px_24px_rgb(80,120,200,0.20)]"
                style={{ filter: 'saturate(0.8)' }} />
              <span className="absolute -right-1 -top-1 flex size-7 items-center justify-center rounded-full bg-primary/90 text-[11px] font-bold text-white shadow-md">
                zZ
              </span>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground/80">数字人休眠中</p>
              <p className="mt-1 text-xs text-muted-foreground">空闲 5 分钟自动休息，点击即可继续服务</p>
            </div>
            {error && <span className="max-w-56 text-center text-xs text-red-400">{error}</span>}
            <button onClick={wake}
              className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-[0_6px_16px_rgb(80,120,200,0.35)] transition-all hover:scale-105 hover:shadow-[0_8px_20px_rgb(80,120,200,0.45)]">
              点击唤醒
            </button>
          </div>
        )}
      </div>

      {/* 加载/错误遮罩 */}
      {(loading || error) && !sleeping && (
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
              <button onClick={reconnect}
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
          {/* 手动休眠 + 性别切换 */}
          <button onClick={() => enterSleep()} title="休眠（断开连接，节省时长）" aria-label="休眠"
            className="shrink-0 flex size-8 items-center justify-center rounded-full border border-white/60 bg-card/70 text-foreground backdrop-blur-md hover:bg-card">
            <Moon className="size-4" />
          </button>
          <button onClick={() => switchGender(gender === 'female' ? 'male' : 'female')} title="切换形象" aria-label="切换形象"
            className="shrink-0 flex size-8 items-center justify-center rounded-full border border-white/60 bg-card/70 text-foreground backdrop-blur-md hover:bg-card">
            {gender === 'female' ? <Venus className="size-4" /> : <Mars className="size-4" />}
          </button>
        </div>
      )}

    </div>
  )
}
