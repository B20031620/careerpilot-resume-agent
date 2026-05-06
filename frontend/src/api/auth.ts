const API_BASE = ''

export interface AuthResponse {
  user_id: string
  email: string
  display_name: string
  token: string
}

export interface UserInfo {
  user_id: string
  email: string
  display_name: string
}

function getToken(): string | null {
  return localStorage.getItem('auth_token')
}

export function setToken(token: string) {
  localStorage.setItem('auth_token', token)
}

export function clearToken() {
  localStorage.removeItem('auth_token')
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  if (token) return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  return { 'Content-Type': 'application/json' }
}

export async function register(email: string, password: string, displayName?: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, display_name: displayName || '' }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: `${res.status}` }))
    throw new Error(body.detail || '注册失败')
  }
  const data = await res.json()
  setToken(data.token)
  return data
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: `${res.status}` }))
    throw new Error(body.detail || '登录失败')
  }
  const data = await res.json()
  setToken(data.token)
  return data
}

export async function getMe(): Promise<UserInfo> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    clearToken()
    throw new Error('未登录')
  }
  return res.json()
}

export function logout() {
  clearToken()
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

// Helper for other API calls to include auth header
export function getAuthHeaders(): Record<string, string> {
  const token = getToken()
  if (token) return { Authorization: `Bearer ${token}` }
  return {}
}

// Wrap fetch to always include auth token
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
    ...getAuthHeaders(),
  }
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  return fetch(url, { ...options, headers })
}
