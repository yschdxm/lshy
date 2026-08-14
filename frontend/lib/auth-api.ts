/**
 * 认证 API 客户端
 */
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getToken(): string | null {
  try { return localStorage.getItem('token') } catch { return null }
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`
  const token = getToken()
  const headers: Record<string,string> = { 'Content-Type': 'application/json', ...options?.headers as Record<string,string> }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(url, { headers, ...options })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.detail || `HTTP ${res.status}`)
  }
  return data
}

export interface AuthUser {
  id: number
  username: string
  role: 'tourist' | 'admin'
  nickname: string
  gender: string
  age_group: string
  region: string
  created_at: string
}

export interface TouristStats {
  total: number
  gender: { name: string; value: number }[]
  age: { name: string; value: number }[]
  region: { name: string; value: number }[]
}

export interface AuthResult {
  token: string
  user: AuthUser
}

/** 游客登录（手机号+密码，首次自动注册；可选补充画像信息） */
export function loginTourist(phone: string, password: string, profile?: { nickname?: string; gender?: string; age_group?: string; region?: string }) {
  return req<AuthResult>('/api/auth/login-tourist', {
    method: 'POST',
    body: JSON.stringify({ phone, password, ...profile }),
  })
}

/** 获取游客画像统计数据 */
export function getTouristStats() {
  return req<TouristStats>('/api/auth/tourist-stats')
}

/** 更新个人信息（需登录） */
export function updateProfile(data: { nickname?: string; gender?: string; age_group?: string; region?: string }) {
  return req<{ status: string; user: AuthUser }>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/** 注销账号 */
export function deleteAccount(userId: number, password: string) {
  return req<{ status: string; message: string }>('/api/auth/delete-account', {
    method: 'DELETE',
    body: JSON.stringify({ user_id: userId, password }),
  })
}

/** 管理员登录 */
export function loginAdmin(account: string, password: string) {
  return req<AuthResult>('/api/auth/login-admin', {
    method: 'POST',
    body: JSON.stringify({ account, password }),
  })
}

/** 管理员注册（需邀请码） */
export function registerAdmin(account: string, password: string, inviteCode: string) {
  return req<AuthResult>('/api/auth/register-admin', {
    method: 'POST',
    body: JSON.stringify({ account: account, password: password, invite_code: inviteCode }),
  })
}
