import { apiGet, apiPost } from './client'

export interface ModelStatus {
  provider: string
  model: string
  base_url: string
  api_key_configured: boolean
  api_key_masked: string | null
  connected: boolean | null
  last_checked: string | null
  error: string | null
}

export interface TestConnectionResult {
  success: boolean
  message: string
}

export async function fetchModelStatus(): Promise<ModelStatus> {
  return apiGet<ModelStatus>('/api/settings/model-status')
}

export async function testModelConnection(): Promise<TestConnectionResult> {
  return apiPost<TestConnectionResult>('/api/settings/test-model-connection')
}
