import { apiGet, apiPost } from './client'

export interface MatchRequest {
  resume_id: string
  job_id: string
}

export interface MatchStrength {
  title?: string
  evidence?: string
}

export interface MatchWeakness {
  title?: string
  reason?: string
}

export interface MatchSuggestion {
  section?: string
  risk_level?: string
  original_text?: string
  revised_text?: string
  issue?: string
  rationale?: string
}

export interface MatchReportDetail {
  report_id: string
  resume_id: string
  job_id: string
  overall_score: number
  skill_score: number
  project_score: number
  experience_score: number
  expression_score: number
  strengths: MatchStrength[]
  weaknesses: MatchWeakness[]
  missing_keywords: string[]
  suggestions: MatchSuggestion[]
  report_markdown: string
}

export async function createMatch(data: MatchRequest): Promise<MatchReportDetail> {
  return apiPost<MatchReportDetail>('/api/matches', data)
}

export async function getMatch(reportId: string): Promise<MatchReportDetail> {
  return apiGet<MatchReportDetail>(`/api/matches/${reportId}`)
}
