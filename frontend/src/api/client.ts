const API_BASE = ''

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body.detail) detail = body.detail
    } catch {}
    throw new ApiError(res.status, detail)
  }
  return res.json()
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body.detail) detail = body.detail
    } catch {}
    throw new ApiError(res.status, detail)
  }
  return res.json()
}

export async function apiPostForm<T>(path: string, body: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body,
  })
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body.detail) detail = body.detail
    } catch {}
    throw new ApiError(res.status, detail)
  }
  return res.json()
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' })
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body.detail) detail = body.detail
    } catch {}
    throw new ApiError(res.status, detail)
  }
}
