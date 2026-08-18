/**
 * 灵境云游 — API 客户端
 * 连接 FastAPI 后端 (localhost:8000)
 */
const BASE = process.env.NEXT_PUBLIC_API_URL || ''

/** 从 localStorage 获取 token */
function getToken(): string | null {
  try {
    return localStorage.getItem('token')
  } catch { return null }
}

/** 构建带认证的 headers */
function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra }
  const token = getToken()
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    headers: authHeaders(options?.headers as Record<string, string> | undefined),
    ...options,
  })
  if (!res.ok) {
    const err = await res.text().catch(() => 'Unknown error')
    throw new Error(`API ${res.status}: ${err}`)
  }
  return res.json()
}

// ============================================================
// Agent 对话（SSE 流式）
// ============================================================
export interface AgentStep {
  phase: 'think' | 'plan' | 'act' | 'observe'
  content: string
  detail?: Record<string, unknown>
  duration_ms?: number
}

export interface AgentDone {
  status: string
  total_ms: number
  iterations?: number
  tools_called?: number
  emotion?: string
  mode?: string
  record_id?: number
}

export function agentChat(
  message: string,
  sessionId: string,
  onStep?: (step: AgentStep) => void,
  onAnswer?: (answer: string) => void,
  onDone?: (done: AgentDone) => void,
  onError?: (err: string) => void,
  history?: { role: string; content: string }[],
) {
  const controller = new AbortController()

  fetch(`${BASE}/api/agent/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ session_id: sessionId, message, history }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) { onError?.(`HTTP ${res.status}`); return }
    const reader = res.body?.getReader()
    if (!reader) { onError?.('Stream not supported'); return }

    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      let eventType = ''
      for (const line of lines) {
        if (line.startsWith('event: ')) { eventType = line.slice(7).trim(); continue }
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (eventType === 'answer') onAnswer?.(data.answer || '')
            else if (eventType === 'done') onDone?.(data as AgentDone)
            else if (eventType === 'error') onError?.(data.error || 'Unknown')
            else onStep?.({ phase: eventType as AgentStep['phase'], content: data.content || '', detail: data.detail })
          } catch { /* skip */ }
        }
      }
    }
  }).catch(() => onError?.('Network error'))

  return () => controller.abort()
}

// ============================================================
// 智能问答（REST 模式 — Fast 路径）
// ============================================================
export async function qaChat(message: string, sessionId: string) {
  return request<{
    answer: string
    sources?: { title: string; type: string; category: string }[]
    intent?: string
    emotion?: string
    response_time_ms?: number
  }>(`/api/ai/chat`, {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, message, mode: 'qa' }),
  })
}

// ============================================================
// 景点
// ============================================================
export async function getSpots(params?: { page?: number; keyword?: string; tag?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.keyword) qs.set('keyword', params.keyword)
  if (params?.tag) qs.set('tag', params.tag)
  return request<{ items: SpotItem[]; total: number }>(`/api/tourist/spots?${qs}`)
}

export interface SpotItem {
  id: number
  spot_id: string
  spot_name: string
  location?: string
  detail_intro?: string
  cultural_meaning?: string
  highlights?: string
  opening_info?: string
  tags?: string[]
  recommended_duration?: number
  latitude?: number
  longitude?: number
}

export async function getSpotDetail(spotId: number) {
  return request<SpotItem>(`/api/tourist/spots/${spotId}`)
}

export async function getHotSpots(limit = 6) {
  return request<{ items: SpotItem[] }>(`/api/tourist/spots/hot?limit=${limit}`)
}

// ============================================================
// 路线推荐
// ============================================================
export async function recommendRoute(prefs: {
  duration_hours: number
  interests?: string[]
  companions?: string
  energy_level?: string
}) {
  return request<RouteResult>(`/api/routes/recommend`, {
    method: 'POST',
    body: JSON.stringify(prefs),
  })
}

export interface RouteResult {
  route_name: string
  total_minutes: number
  walking_distance: number
  spots: { order: number; spot_name: string; spot_id: string; stay_minutes: number; highlight: string }[]
  tips?: string[]
  show_reminders?: string[]
  reason?: string
}

// ============================================================
// 反馈
// ============================================================
export async function submitFeedback(data: {
  session_id?: string
  type: string
  content: string
  score: number
  spot_name?: string
  contact?: string
}) {
  return request<{ status: string }>(`/api/feedback`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ============================================================
// 灵山记忆 / 明信片
// ============================================================
export async function generateSouvenir(sessionId: string) {
  return request<{
    title: string
    date: string
    journey_summary: string
    route_map: { order: number; spot: string }[]
    knowledge_cards: { spot: string; title: string; content: string; icon: string }[]
    virtual_photo: { spot: string; style: string; description: string }
    share_text: string
  }>(`/api/souvenir/generate`, {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  })
}

// ============================================================
// 系统 & 数字人
// ============================================================
export async function getSystemInfo() {
  return request<{ name: string; version: string; llm_configured: boolean }>(`/api/system/info`)
}

export async function getActiveDigitalHuman() {
  return request<{ name: string; avatar_style: string; voice_name: string; greeting_text: string }>(`/api/digital-human/active`)
}

// ============================================================
// 明信片持久化
// ============================================================
export async function savePostcard(data: { title?: string; spot_name?: string; style?: string; image_data: string }) {
  return request<{ id: number; title: string; status: string }>('/api/souvenir/postcards', { method: 'POST', body: JSON.stringify(data) })
}
export async function getPostcards() {
  return request<{ items: { id: number; title: string; spot_name: string; style: string; image_data: string; created_at: string }[] }>('/api/souvenir/postcards')
}
export async function deletePostcardApi(id: number) {
  return request<{ status: string }>(`/api/souvenir/postcards/${id}`, { method: 'DELETE' })
}

/** 获取游客端启用的明信片风格 */
export async function getEnabledStyles() {
  return request<{ styles: { key: string; label: string }[] }>('/api/souvenir/styles')
}

// ============================================================
// 位置服务 — GPS 附近景点推荐
// ============================================================
export interface NearbySpot {
  spot_id: string; spot_name: string; distance_m: number
  location?: string; opening_info?: string
}
export async function getNearbySpots(spotId?: string, lat?: number, lng?: number) {
  const params = new URLSearchParams()
  if (spotId) params.set('spot_id', spotId)
  if (lat !== undefined) params.set('lat', String(lat))
  if (lng !== undefined) params.set('lng', String(lng))
  return request<{ nearby: NearbySpot[]; current_spot: any; method: string }>(`/api/location/nearby?${params}`)
}
export async function setCurrentLocation(spotId: string) {
  return request<{ status: string; current_spot: any; next_spot: any; show_reminders: string[] }>(
    '/api/location/set-current', { method: 'POST', body: JSON.stringify({ spot_id: spotId, method: 'manual' }) }
  )
}

/** 游客对AI回答评分（有用/没用） */
export async function rateAnswer(recordId: number, score: number) {
  return request<{ status: string; record_id: number; satisfaction_score: number }>(
    `/api/ai/feedback/${recordId}?score=${score}`, { method: 'PATCH' }
  )
}

// ============================================================
// 管理后台（简化）
// ============================================================
export async function getDashboardOverview() {
  return request<Record<string, unknown>>(`/api/admin/dashboard/overview`)
}

// ============================================================
// 第三方服务代理（密钥均保存在后端，前端不持有任何 API Key）
// ============================================================

/** TTS 语音合成（后端代理 MiMo） */
export async function ttsSynthesize(text: string, voice = 'female', emotion = 'neutral') {
  return request<{ audio_base64: string; format: string }>(`/api/media/tts`, {
    method: 'POST',
    body: JSON.stringify({ text, voice, emotion }),
  })
}

/** AI 衍生推荐问题（后端代理 LLM） */
export async function getFollowUps(question: string, answer: string) {
  return request<{ questions: string[] }>(`/api/ai/follow-ups`, {
    method: 'POST',
    body: JSON.stringify({ question, answer }),
  })
}

/** AI 图像生成（后端代理 SiliconFlow） */
export async function generateImage(params: { prompt: string; model?: string; image?: string; image_size?: string }) {
  return request<{ url: string; image_base64: string }>(`/api/creative/image`, {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/** 讯飞数字人签名 URL（apiSecret 仅在后端签名） */
export async function getXfyunAuth() {
  return request<{ server_url: string; app_id: string; scene_id: string }>(`/api/digital-human/xfyun-auth`)
}
