import { apiGet, apiPost, apiDelete } from './client'

export interface JobCreate {
  title: string
  company_name?: string
  raw_text?: string
}

export interface JobRead {
  id: string
  title: string
  company_name: string | null
  raw_text: string
  job_profile_json: Record<string, unknown> | null
  analysis_status: string
  created_at: string
  updated_at: string
}

export interface JobListItem {
  id: string
  title: string
  company_name: string | null
  analysis_status: string
  created_at: string
}

export async function createJob(data: JobCreate): Promise<JobRead> {
  return apiPost<JobRead>('/api/jobs', data)
}

export async function listJobs(): Promise<JobListItem[]> {
  return apiGet<JobListItem[]>('/api/jobs')
}

export async function getJob(id: string): Promise<JobRead> {
  return apiGet<JobRead>(`/api/jobs/${id}`)
}

export async function deleteJob(id: string): Promise<void> {
  return apiDelete(`/api/jobs/${id}`)
}
