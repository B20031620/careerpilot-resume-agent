import { useState, useEffect, useRef } from 'react'
import { listResumes, type ResumeListItem } from '../api/resumes'
import { listJobs, type JobListItem } from '../api/jobs'
import {
  createInterview,
  submitAnswer,
  finishInterview,
  type InterviewSession,
  type InterviewTurn,
} from '../api/interviews'
import { ApiError } from '../api/client'
import { getCurrentResumeId, onCurrentResumeChange, setCurrentResumeId } from '../utils/currentResume'

type Phase = 'setup' | 'interview' | 'feedback' | 'finished'

export default function MockInterviewPage() {
  const [resumes, setResumes] = useState<ResumeListItem[]>([])
  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('setup')
  const [lastEvaluation, setLastEvaluation] = useState<InterviewTurn | null>(null)

  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listResumes().then((data) => {
      setResumes(data)
      const current = getCurrentResumeId()
      if (current && data.some((resume) => resume.id === current)) {
        setSelectedResumeId(current)
      } else if (data[0]) {
        setCurrentResumeId(data[0].id)
        setSelectedResumeId(data[0].id)
      }
    }).catch(() => {})
    listJobs().then(setJobs).catch(() => {})
    return onCurrentResumeChange(setSelectedResumeId)
  }, [])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [session])

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const s = await createInterview({
        resume_id: selectedResumeId || undefined,
        jd_id: selectedJobId || undefined,
      })
      setSession(s)
      setPhase('interview')
      setLastEvaluation(null)
    } catch (e) {
      if (e instanceof ApiError) setError(e.detail)
      else setError('创建面试失败，请检查后端服务')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!session || !answer.trim()) return
    setLoading(true)
    setError(null)
    try {
      const s = await submitAnswer(session.id, answer.trim())
      setSession(s)
      setAnswer('')
      // Find the latest evaluated turn
      const evaled = [...s.turns].reverse().find((t) => t.evaluation_json)
      if (evaled) {
        setLastEvaluation(evaled)
        setPhase('feedback')
      }
    } catch (e) {
      if (e instanceof ApiError) setError(e.detail)
      else setError('提交失败，请检查后端服务')
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    setPhase('interview')
    setLastEvaluation(null)
  }

  const handleFinish = async () => {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      const s = await finishInterview(session.id)
      setSession(s)
      setPhase('finished')
    } catch (e) {
      if (e instanceof ApiError) setError(e.detail)
      else setError('结束面试失败')
    } finally {
      setLoading(false)
    }
  }

  const unansweredTurn = session?.turns.find((t) => !t.evaluation_json && !t.user_answer)
  const allTurns = session?.turns || []
  const completedTurns = allTurns.filter((t) => t.evaluation_json)
  const finalReport = session?.final_report_json as Record<string, unknown> | null

  return (
    <div className="max-w-container-max-width mx-auto w-full">
      <header className="mb-6">
        <h2 className="font-h2 text-h2 font-bold text-text-primary">模拟面试</h2>
        <p className="font-body-md text-text-secondary mt-1">基于您的简历与目标岗位，进行多轮实战模拟面试。</p>
      </header>

      {/* Setup */}
      {phase === 'setup' && (
        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm max-w-lg">
          <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-4">开始模拟面试</h3>
          <div className="space-y-3 mb-4">
            <div>
              <label className="block font-body-md text-text-primary font-medium mb-1">选择简历（可选）</label>
              <select
                className="w-full px-3 py-2 border border-border-subtle rounded-lg font-body-md text-text-primary bg-surface focus:outline-none focus:border-agent-accent"
                value={selectedResumeId}
                onChange={(e) => {
                  setSelectedResumeId(e.target.value)
                  setCurrentResumeId(e.target.value)
                }}
              >
                <option value="">-- 不指定简历 --</option>
                {resumes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-body-md text-text-primary font-medium mb-1">选择岗位 JD（可选）</label>
              <select
                className="w-full px-3 py-2 border border-border-subtle rounded-lg font-body-md text-text-primary bg-surface focus:outline-none focus:border-agent-accent"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
              >
                <option value="">-- 不指定岗位 --</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}{j.company_name ? ` @ ${j.company_name}` : ''}</option>)}
              </select>
            </div>
          </div>
          {error && (
            <div className="mb-4 p-3 bg-risk-high/10 border border-risk-high/30 rounded-lg">
              <p className="font-body-md text-risk-high">{error}</p>
            </div>
          )}
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-primary text-on-primary font-body-md py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">{loading ? 'hourglass_top' : 'record_voice_over'}</span>
            {loading ? '创建中...' : '开始面试'}
          </button>
          <p className="font-body-sm text-on-surface-variant mt-3 text-center">
            提示：使用 USE_MOCK_LLM=true 启动后端以在本地演示
          </p>
        </div>
      )}

      {/* Interview */}
      {(phase === 'interview' || phase === 'feedback') && session && (
        <div className="flex flex-col lg:flex-row gap-gutter">
          {/* Left: Interview Plan */}
          <div className="w-full lg:w-3/12">
            <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
              <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-2">面试进度</h3>
              <p className="font-body-sm text-text-secondary mb-4">
                第 {Math.min(session.current_question_index + (unansweredTurn ? 1 : 0), session.question_count_target)}/{session.question_count_target} 题
              </p>
              <div className="relative border-l-2 border-border-subtle ml-3 space-y-4">
                {completedTurns.map((t, i) => (
                  <div key={t.id} className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full z-10 bg-risk-low" />
                    <p className="font-body-sm text-on-surface-variant">
                      第{i + 1}轮 <span className="text-risk-low font-medium">{t.score}分</span>
                    </p>
                  </div>
                ))}
                {unansweredTurn && (
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full z-10 bg-agent-running border-2 border-agent-accent" />
                    <p className="font-body-sm text-primary font-medium">当前问题</p>
                  </div>
                )}
                {completedTurns.length >= (session.question_count_target || 5) && (
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full z-10 bg-risk-high border-2" />
                    <p className="font-body-sm text-on-surface-variant">待结束面试</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleFinish}
                disabled={loading || completedTurns.length === 0}
                className="w-full mt-4 px-4 py-2 bg-risk-high/10 text-risk-high rounded font-body-md hover:bg-risk-high/20 transition-colors disabled:opacity-50"
              >
                结束面试
              </button>
            </div>
          </div>

          {/* Center: Chat */}
          <div className="w-full lg:w-5/12 flex flex-col">
            <div className="bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm flex flex-col h-[550px]">
              <div className="px-5 py-4 border-b border-border-subtle bg-surface-muted flex items-center gap-2">
                <span className="material-symbols-outlined text-agent-accent">record_voice_over</span>
                <h3 className="font-h3 text-h3 text-primary">面试对话</h3>
              </div>
              <div ref={chatRef} className="flex-1 overflow-y-auto p-5 space-y-4">
                {allTurns.map((t) => (
                  <div key={t.id}>
                    {/* Question */}
                    <div className="flex gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-agent-accent/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-agent-accent text-sm">smart_toy</span>
                      </div>
                      <div className="bg-surface-container-low rounded-lg p-3 max-w-[85%]">
                        <p className="font-body-sm text-on-surface-variant mb-1">面试官</p>
                        <p className="font-body-md text-text-primary">{t.question}</p>
                      </div>
                    </div>
                    {/* Answer */}
                    {t.user_answer && (
                      <div className="flex gap-3 justify-end mb-3">
                        <div className="bg-secondary/10 rounded-lg p-3 max-w-[85%]">
                          <p className="font-body-sm text-on-surface-variant mb-1">你</p>
                          <p className="font-body-md text-text-primary">{t.user_answer}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-agent-accent/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined animate-spin text-agent-accent text-sm">progress_activity</span>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-3">
                      <p className="font-body-sm text-on-surface-variant">面试官正在思考...</p>
                    </div>
                  </div>
                )}
              </div>
              {phase === 'interview' && unansweredTurn && (
                <div className="p-4 border-t border-border-subtle">
                  <textarea
                    className="w-full h-20 border border-border-subtle rounded-lg p-3 font-body-md text-text-primary bg-surface resize-none focus:outline-none focus:border-agent-accent"
                    placeholder="输入您的回答..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={loading}
                  />
                  <div className="flex justify-between mt-2">
                    <p className="font-body-sm text-on-surface-variant">提示：回答框架建议采用 STAR 法则</p>
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={loading || !answer.trim()}
                      className="px-4 py-1.5 bg-primary text-on-primary rounded font-body-md disabled:opacity-50"
                    >
                      提交回答
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Feedback */}
          <div className="w-full lg:w-4/12">
            <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
              <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-4">AI 反馈分析</h3>
              {phase === 'interview' && !lastEvaluation && (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-on-primary-container mb-3">psychology</span>
                  <p className="font-body-md text-text-secondary">输入回答并提交以查看反馈</p>
                </div>
              )}
              {lastEvaluation && (
                <>
                  <div className="flex items-center justify-center mb-6">
                    <div className="w-20 h-20 rounded-full border-4 border-risk-medium flex items-center justify-center">
                      <div className="text-center">
                        <span className="font-h2 text-h2 text-primary font-bold">{lastEvaluation.score}</span>
                        <p className="font-body-sm text-text-secondary">评分</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-body-md text-risk-low font-medium mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                        优点
                      </h4>
                      <ul className="space-y-1">
                        {(lastEvaluation.evaluation_json?.strengths || []).map((s: string, i: number) => (
                          <li key={i} className="font-body-sm text-text-secondary">{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-body-md text-risk-medium font-medium mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">trending_up</span>
                        改进点
                      </h4>
                      <ul className="space-y-1">
                        {(lastEvaluation.evaluation_json?.improvements || []).map((s: string, i: number) => (
                          <li key={i} className="font-body-sm text-text-secondary">{s}</li>
                        ))}
                      </ul>
                    </div>
                    {(lastEvaluation.evaluation_json?.risks || []).length > 0 && (
                      <div>
                        <h4 className="font-body-md text-risk-high font-medium mb-2 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">warning</span>
                          高风险提醒
                        </h4>
                        <ul className="space-y-1">
                          {(lastEvaluation.evaluation_json?.risks || []).map((s: string, i: number) => (
                            <li key={i} className="font-body-sm text-text-secondary">{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleNext}
                    disabled={session.current_question_index >= (session.question_count_target || 5)}
                    className="w-full mt-6 bg-primary text-on-primary font-body-md py-3 rounded-lg hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
                  >
                    {session.current_question_index >= (session.question_count_target || 5) ? '所有问题已完成' : '下一题'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Finished */}
      {phase === 'finished' && session && finalReport && (
        <div className="flex flex-col lg:flex-row gap-gutter">
          <div className="w-full lg:w-7/12">
            <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 rounded-full border-4 border-agent-accent flex items-center justify-center">
                  <div className="text-center">
                    <span className="font-h1 text-h1 text-primary font-bold">{finalReport.average_score as number}</span>
                    <p className="font-body-sm text-text-secondary">综合评分</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-h3 text-h3 text-primary mb-1">面试完成</h3>
                  <p className="font-body-md text-text-secondary">共 {finalReport.total_turns as number} 轮</p>
                </div>
              </div>

              {session.final_report_markdown && (
                <div className="bg-surface-container rounded-lg p-4 font-body-sm text-text-primary whitespace-pre-wrap">
                  {session.final_report_markdown}
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-5/12">
            <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
              <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-4">各轮详情</h3>
              <div className="space-y-4">
                {completedTurns.map((t) => (
                  <div key={t.id} className="border border-border-subtle rounded-lg p-3 bg-surface">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-label-caps text-label-caps text-on-surface-variant">第{t.turn_index + 1}轮</span>
                      {t.score != null && (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${t.score >= 80 ? 'bg-risk-low/10 text-risk-low' : t.score >= 60 ? 'bg-risk-medium/10 text-risk-medium' : 'bg-risk-high/10 text-risk-high'}`}>
                          {t.score}分
                        </span>
                      )}
                    </div>
                    <p className="font-body-sm text-text-primary line-clamp-2">{t.question}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setSession(null); setPhase('setup'); setLastEvaluation(null) }}
                className="w-full mt-6 bg-primary text-on-primary font-body-md py-3 rounded-lg hover:bg-on-primary-fixed-variant transition-colors"
              >
                开始新面试
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
