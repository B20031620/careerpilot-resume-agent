import { apiGet, apiPost, apiDelete } from './client'

const API_BASE = ''

function getToken(): string | null {
  return localStorage.getItem('auth_token')
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  meta_json: {
    draft_text?: string
    pitfalls?: string[]
  } | null
  created_at: string
}

export interface ChatSession {
  id: string
  scene: string
  tone: string
  title: string
  status: string
  messages: ChatMessage[]
  created_at: string
  updated_at: string
}

export interface ChatSessionListItem {
  id: string
  scene: string
  tone: string
  title: string
  status: string
  created_at: string
}

export async function listChatSessions(): Promise<ChatSessionListItem[]> {
  return apiGet<ChatSessionListItem[]>('/api/workplace-chat')
}

export async function createChatSession(data: {
  scene?: string
  tone?: string
  context?: string
}): Promise<ChatSession> {
  return apiPost<ChatSession>('/api/workplace-chat', data)
}

export async function getChatSession(sessionId: string): Promise<ChatSession> {
  return apiGet<ChatSession>(`/api/workplace-chat/${sessionId}`)
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  return apiDelete(`/api/workplace-chat/${sessionId}`)
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onDone: (data: { msg_id?: string; meta_json?: Record<string, unknown> | null }) => void
  onError: (error: string) => void
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  if (token) return { Authorization: `Bearer ${token}` }
  return {}
}

export async function streamInitial(sessionId: string, callbacks: StreamCallbacks): Promise<void> {
  const res = await fetch(`${API_BASE}/api/workplace-chat/${sessionId}/init-stream`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (!res.ok) {
    callbacks.onError('请求失败')
    return
  }
  _consumeSSE(res, callbacks)
}

export async function streamMessage(sessionId: string, message: string, callbacks: StreamCallbacks): Promise<void> {
  const res = await fetch(`${API_BASE}/api/workplace-chat/${sessionId}/stream`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  if (!res.ok) {
    callbacks.onError('发送失败')
    return
  }
  _consumeSSE(res, callbacks)
}

async function _consumeSSE(res: Response, callbacks: StreamCallbacks) {
  const reader = res.body?.getReader()
  if (!reader) {
    callbacks.onError('无法读取流')
    return
  }
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    let currentEvent = ''
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim()
      } else if (line.startsWith('data: ')) {
        const dataStr = line.slice(6)
        try {
          const data = JSON.parse(dataStr)
          if (currentEvent === 'token') {
            callbacks.onToken(data.content || '')
          } else if (currentEvent === 'done') {
            callbacks.onDone(data)
          } else if (currentEvent === 'error') {
            callbacks.onError(data.error || '未知错误')
          }
        } catch { /* skip malformed */ }
        currentEvent = ''
      }
    }
  }
}
