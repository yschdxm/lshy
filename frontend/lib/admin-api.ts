/**
 * 管理后台 API 客户端
 */
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getToken(): string | null {
  try { return localStorage.getItem('token') } catch { return null }
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...options?.headers as Record<string, string> }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(url, { headers, ...options })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(errBody || `API ${res.status}`)
  }
  return res.json()
}

// ============================================================
// 1. 工作台 Dashboard
// ============================================================
export interface DashboardOverview {
  stats: { key: string; label: string; value: number | string; trend: string; icon: string; tint: string }[]
  trend: { date: string; chats: number }[]
  hot_spots: { question: string; count: number }[]
  todos: { key: string; title: string; tag: string; tone: string }[]
}
export function getDashboard(days?: number) {
  const qs = days ? `?days=${days}` : ''
  return req<DashboardOverview>(`/api/admin/dashboard/overview${qs}`)
}

// ============================================================
// 2. 知识库管理
// ============================================================
export interface KnowledgeStats { total: number; published: number; draft: number; categories: { name: string; count: number }[] }
export function getKnowledgeStats() { return req<KnowledgeStats>('/api/admin/knowledge/stats') }

/** 后端实际返回的文档字段 */
export interface DocItem {
  id: number
  title: string
  category: string
  status: string
  content: string        // 列表接口截断至 200 字符；详情接口返回全文
  source_file?: string
  created_at: string
  updated_at: string
}
export interface DocList { total: number; page: number; page_size: number; items: DocItem[] }
export function getDocs(params?: { page?: number; page_size?: number; keyword?: string; category?: string; status?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.page_size) qs.set('page_size', String(params.page_size))
  if (params?.keyword) qs.set('keyword', params.keyword)
  if (params?.category) qs.set('category', params.category)
  if (params?.status) qs.set('status', params.status)
  return req<DocList>(`/api/admin/knowledge/docs?${qs}`)
}
export function createDoc(data: { title: string; category: string; content: string; status?: string; source_file?: string }) {
  return req<{ id: number; title: string; status: string }>('/api/admin/knowledge/docs', { method: 'POST', body: JSON.stringify(data) })
}
export function updateDoc(id: number, data: { title?: string; category?: string; content?: string; status?: string }) {
  return req<{ status: string }>(`/api/admin/knowledge/docs/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}
export function deleteDocApi(id: number) {
  return req<{ status: string }>(`/api/admin/knowledge/docs/${id}`, { method: 'DELETE' })
}
export function batchDocs(ids: number[], action: string) {
  return req<{ status: string; affected: number }>('/api/admin/knowledge/docs/batch', { method: 'POST', body: JSON.stringify({ ids, action }) })
}

/** 获取文档全文详情（通过公开 API） */
export function getDocDetail(docId: number) {
  return req<DocItem>(`/api/knowledge/${docId}`)
}

/** 重建向量索引 */
export function rebuildVectorIndex() {
  return req<any>('/api/ai/rebuild-index', { method: 'POST' })
}

// ---- 分类批量操作 ----

/** 重命名分类 */
export function renameCategory(oldName: string, newName: string) {
  return req<{ status: string; affected: number }>('/api/admin/knowledge/category', { method: 'PUT', body: JSON.stringify({ old_name: oldName, new_name: newName }) })
}
/** 删除分类及该分类下所有文档 */
export function deleteCategory(name: string) {
  return req<{ status: string; deleted: number }>(`/api/admin/knowledge/category?name=${encodeURIComponent(name)}`, { method: 'DELETE' })
}

// ---- FAQ 管理 ----

export interface FaqStats { total: number; published: number; total_views: number; draft: number }
export function getFaqStats() { return req<FaqStats>('/api/admin/faq/stats') }

export interface FaqItem { id: number; question: string; answer: string; category: string; views: number; status: string; created_at: string; updated_at: string }
export interface FaqList { total: number; page: number; page_size: number; items: FaqItem[] }
export function getFaqs(params?: { page?: number; page_size?: number; keyword?: string; category?: string; status?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.page_size) qs.set('page_size', String(params.page_size))
  if (params?.keyword) qs.set('keyword', params.keyword)
  if (params?.category) qs.set('category', params.category)
  if (params?.status) qs.set('status', params.status)
  return req<FaqList>(`/api/admin/faq/items?${qs}`)
}
export function createFaq(data: { question: string; answer: string; category: string; status?: string }) {
  return req<{ id: number; question: string; status: string }>('/api/admin/faq/items', { method: 'POST', body: JSON.stringify(data) })
}
export function updateFaq(id: number, data: { question?: string; answer?: string; category?: string; status?: string }) {
  return req<{ status: string }>(`/api/admin/faq/items/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}
export function deleteFaq(id: number) {
  return req<{ status: string }>(`/api/admin/faq/items/${id}`, { method: 'DELETE' })
}
export function incrementFaqView(id: number) {
  return req<{ views: number }>(`/api/admin/faq/items/${id}/view`, { method: 'POST' })
}

// ---- 路线管理 ----

export interface RouteStats { total: number; today: number; success_rate: number; avg_satisfaction: number; type_dist: { name: string; count: number }[] }
export function getRouteStats() { return req<RouteStats>('/api/admin/routes/stats') }

export interface RouteItem { id: number; route_name: string; route_type: string; duration_minutes: number; suitable_people: string; route_spots: { spot_id: string; name: string; stay: number }[]; route_description: string; created_at: string }
export interface RouteList { total: number; page: number; page_size: number; items: RouteItem[] }
export function getRouteList(params?: { page?: number; page_size?: number; route_type?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.page_size) qs.set('page_size', String(params.page_size))
  if (params?.route_type) qs.set('route_type', params.route_type)
  return req<RouteList>(`/api/admin/routes/list?${qs}`)
}

// ---- 明信片管理 ----

export interface PostcardStats { total: number; today: number; styles: { name: string; count: number }[] }
export function getPostcardStats() { return req<PostcardStats>('/api/admin/postcards/stats') }

export interface PostcardItem { id: number; title: string; spot_name: string; style: string; image_data: string; created_at: string }
export interface PostcardList { total: number; page: number; page_size: number; items: PostcardItem[] }
export function getPostcardList(params?: { page?: number; page_size?: number; style?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.page_size) qs.set('page_size', String(params.page_size))
  if (params?.style) qs.set('style', params.style)
  return req<PostcardList>(`/api/admin/postcards/list?${qs}`)
}

// ---- 数字人管理 ----

export interface DigitalHumanItem {
  id: number; name: string; avatar_style: string; voice_name: string;
  avatar_id: string; vcn: string; gender: string; image_url: string;
  scenes: string; personality: string; greeting_text: string; is_active: boolean;
}
export function getDigitalHumans(params?: { page?: number; page_size?: number; is_active?: boolean }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.page_size) qs.set('page_size', String(params.page_size))
  if (params?.is_active !== undefined) qs.set('is_active', String(params.is_active))
  return req<{ items: DigitalHumanItem[]; total: number }>(`/api/digital-human?${qs}`)
}
export function createDigitalHuman(data: Partial<DigitalHumanItem>) {
  return req<DigitalHumanItem>('/api/digital-human', { method: 'POST', body: JSON.stringify(data) })
}
export function updateDigitalHuman(id: number, data: Partial<DigitalHumanItem>) {
  return req<DigitalHumanItem>(`/api/digital-human/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}
export function deleteDigitalHuman(id: number) {
  return req<any>(`/api/digital-human/${id}`, { method: 'DELETE' })
}

// ============================================================
// 3. QA 记录
// ============================================================
export interface QARecord { id: number; question: string; answer: string; emotion: string; intent: string; satisfaction: number; response_time_ms: number; created_at: string }
export interface QAList { total: number; page: number; page_size: number; items: QARecord[] }
export function getQARecords(params?: { page?: number; keyword?: string; status?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.keyword) qs.set('keyword', params.keyword)
  if (params?.status) qs.set('status', params.status)
  return req<QAList>(`/api/admin/qa/records?${qs}`)
}
export function getQAStats() { return req<{ total: number; avg_response_ms: number; hit_count: number; miss_count: number }>('/api/admin/qa/stats') }
export function updateQARecord(id: number, data: { answer?: string; intent?: string }) {
  return req<{ status: string }>(`/api/admin/qa/records/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

// ============================================================
// 4. 数据大屏
// ============================================================
export function getScreenSummary() { return req<any>('/api/admin/screen/summary') }
export function getScreenTrend(days = 7) { return req<any>(`/api/admin/screen/trend?days=${days}`) }
export function getScreenRegion() { return req<any>('/api/admin/screen/region') }
export function getScreenLive() { return req<{ events: { text: string; time: string }[] }>('/api/admin/screen/live') }

// ============================================================
// 5. 反馈
// ============================================================
export interface FeedbackOverview { total: number; today: number; avg_score: number; likes: number; dislikes: number; trend: { date: string; count: number; avg: number }[] }
export function getFeedbackOverview() { return req<FeedbackOverview>('/api/admin/feedback/overview') }
export function getFeedbackList(params?: { page?: number; page_size?: number; type?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.page_size) qs.set('page_size', String(params.page_size))
  if (params?.type) qs.set('type', String(params.type))
  return req<any>(`/api/admin/feedback/list?${qs}`)
}

// ============================================================
// 6. 游客行为分析
// ============================================================
export interface BehaviorStats {
  total_visitors: number; avg_stay_hours: number; avg_cost: number; avg_satisfaction: number
  cost_breakdown: { ticket: number; food: number; shopping: number; transport: number; entertainment: number }
  age_dist: { name: string; value: number }[]
  gender_dist: { name: string; value: number }[]
  group_dist: { name: string; value: number }[]
  type_dist: { name: string; value: number }[]
  satisfaction_dist: { name: string; value: number }[]
}
export function getBehaviorStats() { return req<BehaviorStats>('/api/admin/behavior/stats') }
export async function uploadBehaviorExcel(file: File) {
  const form = new FormData(); form.append('file', file)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers: Record<string,string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/behavior/upload`, { method: 'POST', headers, body: form })
  if (!res.ok) { const d = await res.json().catch(()=>({detail:'Upload failed'})); throw new Error(d.detail) }
  return res.json()
}

// ============================================================
// 7. 景点管理 (Admin)
// ============================================================
export function getAdminSpots(params?: { page?: number; keyword?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.keyword) qs.set('keyword', params.keyword)
  return req<any>(`/api/admin/spots/admin-list?${qs}`)
}
export function toggleSpot(spotId: number, enabled: boolean) {
  return req<any>(`/api/admin/spots/${spotId}/toggle`, { method: 'PATCH', body: JSON.stringify({ enabled }) })
}
export function getSpotsStats() {
  return req<{ total_spots: number; today_guides: number; avg_response_ms: number; avg_satisfaction: number }>('/api/admin/spots/stats')
}
export function getSpotsSamples(limit = 10) {
  return req<{ items: { id: number; question: string; answer: string; intent: string; emotion: string; response_time_ms: number; satisfaction: number; created_at: string }[] }>(`/api/admin/spots/samples?limit=${limit}`)
}
export function previewSpotNarration(data: { persona?: string; length?: string }) {
  return req<{ spot_name: string; persona: string; length: string; generated_text: string }>('/api/admin/spots/preview', { method: 'POST', body: JSON.stringify(data) })
}

// ============================================================
// 8. 用户管理
// ============================================================

export interface UserStats { total: number; admin_count: number; active_today: number; disabled: number }
export function getUsersStats() { return req<UserStats>('/api/admin/users/stats') }

export interface UserItem {
  id: number; name: string; account: string; role: string; role_label: string
  department: string; status: string; gender: string; age_group: string; region: string
  last_login: string; created_at: string
}
export interface UserList { total: number; page: number; page_size: number; items: UserItem[] }
export function getUsers(params?: { page?: number; page_size?: number; keyword?: string; role?: string; role_label?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.page_size) qs.set('page_size', String(params.page_size))
  if (params?.keyword) qs.set('keyword', params.keyword)
  if (params?.role) qs.set('role', params.role)
  if (params?.role_label) qs.set('role_label', params.role_label)
  return req<UserList>(`/api/admin/users/list?${qs}`)
}

export function createUser(data: { account: string; password: string; name?: string; role?: string; department?: string }) {
  return req<{ status: string; id: number; name: string; account: string }>('/api/admin/users', { method: 'POST', body: JSON.stringify(data) })
}

export function updateUser(id: number, data: { name?: string; role?: string; department?: string }) {
  return req<{ status: string }>(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export function toggleUserStatus(id: number) {
  return req<{ status: string; is_active: string }>(`/api/admin/users/${id}/toggle`, { method: 'PATCH' })
}

// ============================================================
// 9. 角色权限管理
// ============================================================

export interface RoleStats { total_roles: number; total_members: number; total_perms: number; custom_roles: number }
export function getRolesStats() { return req<RoleStats>('/api/admin/roles/stats') }

export interface RoleItem {
  id: number; name: string; desc: string; built_in: boolean; status: string
  members: number; perms: Record<string, string>
}
export interface RoleList { items: RoleItem[] }
export function getRoles() { return req<RoleList>('/api/admin/roles/list') }

export function createRole(data: { name: string; desc?: string }) {
  return req<{ status: string; id: number; name: string }>('/api/admin/roles', { method: 'POST', body: JSON.stringify(data) })
}

export function updateRole(id: number, data: { name: string; desc?: string }) {
  return req<{ status: string }>(`/api/admin/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export function updateRolePerms(id: number, perms: Record<string, string>) {
  return req<{ status: string }>(`/api/admin/roles/${id}/perms`, { method: 'PATCH', body: JSON.stringify({ perms }) })
}

export function toggleRoleStatus(id: number) {
  return req<{ status: string; is_active: boolean }>(`/api/admin/roles/${id}/toggle`, { method: 'PATCH' })
}

// ============================================================
// 10. 系统设置
// ============================================================

export function getSettings() { return req<{ settings: Record<string, string> }>('/api/admin/settings') }
export function saveSettings(settings: Record<string, string>) {
  return req<{ status: string }>('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ settings }) })
}
export function resetSettings() { return req<{ status: string; settings: Record<string, string> }>('/api/admin/settings/reset', { method: 'POST' }) }
export function clearCache() { return req<{ status: string }>('/api/admin/settings/clear-cache', { method: 'POST' }) }

// ============================================================
// 11. 审计日志
// ============================================================

export interface LogStats { today: number; login_count: number; ops_count: number; warn_count: number }
export function getLogsStats() { return req<LogStats>('/api/admin/logs/stats') }

export interface LogEntry { id: number; time: string; user: string; type: string; level: string; action: string; ip: string }
export interface LogList { total: number; page: number; page_size: number; items: LogEntry[] }
export function getLogs(params?: { page?: number; page_size?: number; keyword?: string; type?: string; level?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.page_size) qs.set('page_size', String(params.page_size))
  if (params?.keyword) qs.set('keyword', params.keyword)
  if (params?.type) qs.set('type', params.type)
  if (params?.level) qs.set('level', params.level)
  return req<LogList>(`/api/admin/logs/list?${qs}`)
}

export function cleanLogs(days = 30) {
  return req<{ status: string; deleted: number }>(`/api/admin/logs/clean?days=${days}`, { method: 'POST' })
}

// ============================================================
// 12. 明信片风格管理
// ============================================================

export interface PostcardStyleItem { key: string; label: string; cover: string; enabled: boolean; usage: number }
export function getPostcardStyles() { return req<{ styles: PostcardStyleItem[] }>('/api/admin/postcard-styles') }
export function togglePostcardStyle(key: string) {
  return req<{ status: string; key: string; enabled: boolean }>(`/api/admin/postcard-styles/${key}/toggle`, { method: 'PATCH' })
}

// ============================================================
// 13. 便民服务设施管理
// ============================================================

export interface ServiceItem {
  id: number; name: string; type: string; location: string
  features: string[]; hours: string; status: string; updated_at: string
}
export interface ServiceList { total: number; page: number; page_size: number; items: ServiceItem[] }
export function getServices(params?: { page?: number; page_size?: number; keyword?: string; type?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.page_size) qs.set('page_size', String(params.page_size))
  if (params?.keyword) qs.set('keyword', params.keyword)
  if (params?.type) qs.set('type', params.type)
  return req<ServiceList>(`/api/admin/services/list?${qs}`)
}

export function createService(data: { name: string; type: string; location?: string; features?: string[]; hours?: string; status?: string }) {
  return req<{ status: string; id: number }>('/api/admin/services', { method: 'POST', body: JSON.stringify(data) })
}

export function updateService(id: number, data: { name?: string; type?: string; location?: string; features?: string[]; hours?: string; status?: string }) {
  return req<{ status: string }>(`/api/admin/services/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export function deleteService(id: number) {
  return req<{ status: string }>(`/api/admin/services/${id}`, { method: 'DELETE' })
}

// ============================================================
// 14. 通知
// ============================================================

export interface NotificationItem { id: number; title: string; subtitle: string; link: string; is_read: boolean; created_at: string }
export function getNotifications() { return req<{ unread: number; items: NotificationItem[] }>('/api/admin/notifications') }
export function markAllRead() { return req<{ status: string }>('/api/admin/notifications/read-all', { method: 'POST' }) }
