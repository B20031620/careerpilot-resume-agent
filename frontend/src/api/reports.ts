import { apiGet, apiDelete } from './client'

export interface ReportListItem {
  id: string
  resume_id: string | null
  jd_id: string | null
  report_type: string
  overall_score: number | null
  created_at: string
}

export async function listReports(): Promise<ReportListItem[]> {
  return apiGet<ReportListItem[]>('/api/reports')
}

export async function deleteReport(id: string): Promise<void> {
  return apiDelete(`/api/reports/${id}`)
}
