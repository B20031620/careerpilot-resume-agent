import { apiPost } from './client'

export interface PolishSuggestion {
  section: string
  original_text: string
  issue: string
  revised_text: string
  rationale: string
  risk_level: 'low' | 'medium' | 'high'
}

export interface PolishResult {
  resume_id: string
  suggestions: PolishSuggestion[]
  overall_assessment: string
  polish_markdown: string | null
}

export async function polishResume(resumeId: string, jdText?: string): Promise<PolishResult> {
  return apiPost<PolishResult>(`/api/resumes/${resumeId}/polish`, {
    jd_text: jdText || null,
  })
}
