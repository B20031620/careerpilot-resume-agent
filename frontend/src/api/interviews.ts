import { apiGet, apiPost } from './client'

export interface InterviewTurn {
  id: string
  turn_index: number
  question: string
  question_type: string
  user_answer: string | null
  evaluation_json: Record<string, string[]> | null
  score: number | null
  follow_up_needed: boolean
  parent_turn_id: string | null
  created_at: string
}

export interface InterviewSession {
  id: string
  resume_id: string | null
  jd_id: string | null
  interview_type: string
  status: string
  question_count_target: number
  current_question_index: number
  turns: InterviewTurn[]
  final_report_json: Record<string, unknown> | null
  final_report_markdown: string | null
  current_question: string | null
  current_question_type: string | null
  created_at: string
  updated_at: string
}

export async function createInterview(data: {
  resume_id?: string
  jd_id?: string
  interview_type?: string
  question_count_target?: number
}): Promise<InterviewSession> {
  return apiPost<InterviewSession>('/api/interviews', data)
}

export async function getInterview(sessionId: string): Promise<InterviewSession> {
  return apiGet<InterviewSession>(`/api/interviews/${sessionId}`)
}

export async function submitAnswer(
  sessionId: string,
  answer: string,
): Promise<InterviewSession> {
  return apiPost<InterviewSession>(`/api/interviews/${sessionId}/answer`, { answer })
}

export async function finishInterview(sessionId: string): Promise<InterviewSession> {
  return apiPost<InterviewSession>(`/api/interviews/${sessionId}/finish`, {})
}
