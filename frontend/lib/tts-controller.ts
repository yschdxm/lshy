/**
 * 统一 TTS 语音控制器
 * 统管：讯飞数字人（优先） + MiMo Web Audio（降级）
 * 所有模块统一通过此控制器播放/停止语音
 */

// TTS 由后端代理（密钥仅存服务端），见 /api/media/tts
import { ttsSynthesize } from '@/lib/api'

const VOICE = '水母'

// ---- 内部状态 ----
let currentAudio: HTMLAudioElement | null = null
let speaking = false
const listeners = new Set<(state: 'idle' | 'speaking') => void>()

function notifyListeners(state: 'idle' | 'speaking') {
  listeners.forEach((cb) => cb(state))
}

// ---- Web Audio 播放 ----
function stopWebAudio() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
}

async function playWebAudio(text: string): Promise<void> {
  stopWebAudio()
  try {
    const data = await ttsSynthesize(text, VOICE)
    const b64 = data?.audio_base64
    if (!b64) return
    const audio = new Audio(`data:audio/${data.format || 'wav'};base64,${b64}`)
    currentAudio = audio
    return new Promise((resolve) => {
      audio.onended = () => { currentAudio = null; speaking = false; notifyListeners('idle'); resolve() }
      audio.onerror = () => { currentAudio = null; speaking = false; notifyListeners('idle'); resolve() }
      audio.play()
    })
  } catch { stopWebAudio(); speaking = false; notifyListeners('idle') }
}

// ---- Xfyun 数字人 ----
function isXfyunReady(): boolean {
  try {
    return !!(window as any).__xfyunSpeak
      && !!(window as any).__xfyunReady  // WebSocket 已连接
  } catch { return false }
}

function xfyunSpeak(text: string) {
  const speak = (window as any).__xfyunSpeak
  if (speak) speak(text)
}

function xfyunStop() {
  const stop = (window as any).__xfyunStop
  if (stop) stop()
}

// ---- 公开 API ----

/** 订阅状态变化，返回取消订阅函数 */
export function onTTSStateChange(cb: (state: 'idle' | 'speaking') => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

/** 是否为正在播放 */
export function isSpeaking(): boolean {
  return speaking
}

/** 统一播报：讯飞优先，否则 Web Audio */
export async function speak(text: string): Promise<void> {
  // 先停止当前播放
  stop()

  speaking = true
  notifyListeners('speaking')

  if (isXfyunReady()) {
    xfyunSpeak(text)
    // 讯飞播报时长估算（约 4 字/秒），播完自动切 idle
    setTimeout(() => {
      speaking = false
      notifyListeners('idle')
    }, Math.max(2000, text.length * 250))
  } else {
    await playWebAudio(text)
  }
}

/** 统一停止：停讯飞 + 停 Web Audio */
export function stop() {
  xfyunStop()
  stopWebAudio()
  speaking = false
  notifyListeners('idle')
}
