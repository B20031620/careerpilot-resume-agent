import { apiGet, apiPost, apiDelete, apiPostForm } from './client'

export interface ResumeCreate {
  title: string
  source_type?: string
  raw_text?: string
}

export interface ResumeRead {
  id: string
  title: string
  source_type: string
  raw_text: string
  structured_json: Record<string, unknown> | null
  parse_status: string
  parse_warnings: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface ResumeListItem {
  id: string
  title: string
  source_type: string
  parse_status: string
  created_at: string
}

export async function createResume(data: ResumeCreate): Promise<ResumeRead> {
  return apiPost<ResumeRead>('/api/resumes', data)
}

export async function uploadResumeFile(file: File, title?: string): Promise<ResumeRead> {
  const formData = new FormData()
  formData.append('file', file)
  if (title?.trim()) formData.append('title', title.trim())
  return apiPostForm<ResumeRead>('/api/resumes/upload', formData)
}

export async function listResumes(): Promise<ResumeListItem[]> {
  return apiGet<ResumeListItem[]>('/api/resumes')
}

export async function getResume(id: string): Promise<ResumeRead> {
  return apiGet<ResumeRead>(`/api/resumes/${id}`)
}

export async function deleteResume(id: string): Promise<void> {
  return apiDelete(`/api/resumes/${id}`)
}
