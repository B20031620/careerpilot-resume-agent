import { useState, useEffect, useRef } from 'react'
import { listResumes, type ResumeListItem } from '../api/resumes'
import {
  createInterview,
  submitAnswer,
  finishInterview,
  getInterview,
  listInterviews as listInterviewSessions,
  type InterviewSession,
} from '../api/interviews'
import { ApiError } from '../api/client'
import { getCurrentResumeId, onCurrentResumeChange, setCurrentResumeId } from '../utils/currentResume'

type Phase = 'setup' | 'interview' | 'finished'

const questionTypeLabels: Record<string, string> = {
  behavioral: '行为面试',
  technical: '技术面试',
  project_deep_dive: '项目深挖',
  system_design: '系统设计',
  skill: '技能考察',
}

function scoreColor(score: number | null) {
  if (score == null) return ''
  if (score >= 80) return 'text-risk-low'
  if (score >= 60) return 'text-risk-medium'
  return 'text-risk-high'
}

function scoreBg(score: number | null) {
  if (score == null) return ''
  if (score >= 80) return 'bg-risk-low/10'
  if (score >= 60) return 'bg-risk-medium/10'
  return 'bg-risk-high/10'
}

export default function MockInterviewPage() {
  const [resumes, setResumes] = useState<ResumeListItem[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [jdText, setJdText] = useState('')
  const [jdOpen, setJdOpen] = useState(false)
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('setup')
  const [history, setHistory] = useState<InterviewSession[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    listResumes().then((data) => {
      setResumes(data)
      const current = getCurrentResumeId()
      if (current && data.some((r) => r.id === current)) {
        setSelectedResumeId(current)
      } else if (data[0]) {
        setCurrentResumeId(data[0].id)
        setSelectedResumeId(data[0].id)
      }
    }).catch(() => {})
    onCurrentResumeChange(setSelectedResumeId)
  }, [])

  useEffect(() => {
    if (phase === 'setup') {
      listInterviewSessions().then(setHistory).catch(() => {})
    }
  }, [phase])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [session, loading])

  useEffect(() => {
    if (!loading && phase === 'interview' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [loading, phase])

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const s = await createInterview({
        resume_id: selectedResumeId || undefined,
        jd_text: jdOpen && jdText.trim() ? jdText.trim() : undefined,
      })
      setSession(s)
      setPhase('interview')
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
    } catch (e) {
      if (e instanceof ApiError) setError(e.detail)
      else setError('提交失败，请重试')
    } finally {
      setLoading(false)
    }
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitAnswer()
    }
  }

  const handleResumeSession = async (sessionId: string) => {
    // For now, we only support viewing finished sessions
    setShowHistory(false)
    setError(null)
    try {
      const s = await getInterview(sessionId)
      setSession(s)
      if (s.status === 'finished') {
        setPhase('finished')
      } else {
        setPhase('interview')
      }
    } catch {
      setError('加载面试记录失败')
    }
  }

  const allTurns = session?.turns || []
  const currentTurn = allTurns.find((t) => !t.evaluation_json && !t.user_answer)
  const completedTurns = allTurns.filter((t) => t.evaluation_json)
  const finalReport = session?.final_report_json as Record<string, unknown> | null

  return (
    <div className="max-w-container-max-width mx-auto w-full">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-h2 text-h2 font-bold text-text-primary">模拟面试</h2>
          <p className="font-body-md text-text-secondary mt-1">AI 面试官基于简历出题，实时评估你的回答</p>
        </div>
        {phase === 'setup' && history.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle text-text-primary font-body-md hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            历史记录 ({history.length})
          </button>
        )}
      </header>

      {/* History sidebar */}
      {showHistory && phase === 'setup' && (
        <div className="mb-6 bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
            <h3 className="font-body-md text-text-primary font-medium">历史面试记录</h3>
            <button onClick={() => setShowHistory(false)} className="text-on-surface-variant hover:text-text-primary">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-border-subtle">
            {history.map((s) => (
              <button
                key={s.id}
                onClick={() => handleResumeSession(s.id)}
                className="w-full px-5 py-3 text-left hover:bg-surface-container-low transition-colors flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-on-primary-container">{s.status === 'finished' ? 'assignment_turned_in' : 'pending'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-body-md text-text-primary truncate">
                    {s.status === 'finished' ? `${(s.final_report_json as Record<string, unknown>)?.average_score ?? '--'}分` : '进行中'} · {s.interview_type}
                  </p>
                  <p className="font-body-sm text-on-surface-variant">{new Date(s.created_at).toLocaleString('zh-CN')}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Setup Phase */}
      {phase === 'setup' && (
        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-5 shadow-sm max-w-lg">
          <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-4">开始模拟面试</h3>

          {/* Resume selector */}
          <div className="mb-4">
            <label className="block font-body-md text-text-primary font-medium mb-1.5">选择简历</label>
            {resumes.length === 0 ? (
              <p className="font-body-sm text-on-surface-variant">暂无简历，请先在「我的简历」页面上传</p>
            ) : (
              <select
                className="w-full px-3 py-2 border border-border-subtle rounded-lg font-body-md text-text-primary bg-surface focus:outline-none focus:border-agent-accent"
                value={selectedResumeId}
                onChange={(e) => { setSelectedResumeId(e.target.value); setCurrentResumeId(e.target.value) }}
              >
                <option value="">-- 不指定简历 --</option>
                {resumes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
            )}
          </div>

          {/* Optional JD */}
          <div className="mb-4">
            <button
              onClick={() => setJdOpen(!jdOpen)}
              className="flex items-center gap-1.5 font-body-md text-agent-accent hover:underline"
            >
              <span className="material-symbols-outlined text-[18px]">{jdOpen ? 'expand_less' : 'expand_more'}</span>
              有目标岗位？粘贴 JD 让面试更有针对性
            </button>
            {jdOpen && (
              <div className="mt-2">
                <textarea
                  className="w-full px-3 py-2 border border-border-subtle rounded-lg font-body-md text-text-primary bg-surface focus:outline-none focus:border-agent-accent resize-y"
                  rows={3}
                  placeholder="粘贴目标岗位的职位描述..."
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="mb-4 p-3 rounded-lg bg-agent-accent/5 border border-agent-accent/20">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-agent-accent mt-0.5">lightbulb</span>
              <div className="font-body-sm text-text-secondary">
                <p className="font-medium text-text-primary mb-1">面试小贴士</p>
                <p>AI 面试官会根据你的简历出题，回答时建议使用 STAR 法则（情境-任务-行动-结果），让回答更有结构。</p>
              </div>
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
            <span className="material-symbols-outlined text-sm">{loading ? 'progress_activity' : 'record_voice_over'}</span>
            {loading ? '准备中...' : '开始面试'}
          </button>
        </div>
      )}

      {/* Interview Phase - Chat-centric UI */}
      {phase === 'interview' && session && (
        <div className="max-w-3xl mx-auto">
          {/* Progress bar */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-border-subtle overflow-hidden">
              <div
                className="h-full bg-agent-accent rounded-full transition-all duration-500"
                style={{ width: `${Math.min((completedTurns.length / (session.question_count_target || 5)) * 100, 100)}%` }}
              />
            </div>
            <span className="font-body-sm text-on-surface-variant shrink-0">
              {completedTurns.length}/{session.question_count_target} 题
            </span>
          </div>

          {/* Chat area */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm overflow-hidden">
            <div ref={chatRef} className="h-[480px] overflow-y-auto p-5 space-y-5">
              {/* Welcome message */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-agent-accent/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-agent-accent text-sm">smart_toy</span>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3 max-w-[85%]">
                  <p className="font-body-md text-text-primary">
                    你好！我是 AI 面试官。我已看过你的简历，接下来我会逐一提问，请在回答后查看我的实时反馈。准备好了吗？
                  </p>
                </div>
              </div>

              {/* Conversation turns */}
              {allTurns.map((t) => (
                <div key={t.id}>
                  {/* Question */}
                  <div className="flex gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-agent-accent/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-agent-accent text-sm">smart_toy</span>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-3 max-w-[85%]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-label-caps text-label-caps text-agent-accent">
                          {questionTypeLabels[t.question_type] || t.question_type}
                        </span>
                      </div>
                      <p className="font-body-md text-text-primary">{t.question}</p>
                    </div>
                  </div>

                  {/* User Answer */}
                  {t.user_answer && (
                    <div className="flex gap-3 justify-end mb-2">
                      <div className="bg-secondary/10 rounded-lg p-3 max-w-[85%]">
                        <p className="font-body-md text-text-primary whitespace-pre-wrap">{t.user_answer}</p>
                      </div>
                    </div>
                  )}

                  {/* Inline Feedback */}
                  {t.evaluation_json && (
                    <div className="flex gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-agent-accent/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-agent-accent text-sm">smart_toy</span>
                      </div>
                      <div className="bg-surface-container-low rounded-lg p-3 max-w-[85%] w-full">
                        {/* Score + brief feedback */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded font-body-sm text-xs font-bold ${scoreBg(t.score)} ${scoreColor(t.score)}`}>
                            {t.score}分
                          </span>
                          {Boolean((t.evaluation_json as Record<string, unknown>).brief_feedback) && (
                            <span className="font-body-sm text-text-primary">
                              {String((t.evaluation_json as Record<string, unknown>).brief_feedback)}
                            </span>
                          )}
                        </div>
                        {/* Expandable details */}
                        <details className="group">
                          <summary className="font-body-sm text-agent-accent cursor-pointer hover:underline">
                            查看详细反馈
                          </summary>
                          <div className="mt-2 space-y-2 text-sm">
                            {((t.evaluation_json as Record<string, unknown>).strengths as string[] || []).length > 0 && (
                              <div>
                                <span className="font-medium text-risk-low">优点: </span>
                                <span className="text-text-secondary">{((t.evaluation_json as Record<string, unknown>).strengths as string[]).join('、')}</span>
                              </div>
                            )}
                            {((t.evaluation_json as Record<string, unknown>).improvements as string[] || []).length > 0 && (
                              <div>
                                <span className="font-medium text-risk-medium">改进: </span>
                                <span className="text-text-secondary">{((t.evaluation_json as Record<string, unknown>).improvements as string[]).join('、')}</span>
                              </div>
                            )}
                            {((t.evaluation_json as Record<string, unknown>).risks as string[] || []).length > 0 && (
                              <div>
                                <span className="font-medium text-risk-high">风险: </span>
                                <span className="text-text-secondary">{((t.evaluation_json as Record<string, unknown>).risks as string[]).join('、')}</span>
                              </div>
                            )}
                          </div>
                        </details>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
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

            {/* Input area */}
            {!loading && currentTurn && (
              <div className="p-4 border-t border-border-subtle">
                <textarea
                  ref={inputRef}
                  className="w-full h-24 border border-border-subtle rounded-lg p-3 font-body-md text-text-primary bg-surface resize-none focus:outline-none focus:border-agent-accent"
                  placeholder="输入你的回答... (Enter 提交，Shift+Enter 换行)"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="font-body-sm text-on-surface-variant">提示：使用 STAR 法则组织回答</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleFinish}
                      disabled={completedTurns.length === 0}
                      className="px-3 py-1.5 border border-border-subtle text-text-primary rounded-lg font-body-md hover:bg-surface-container-low transition-colors disabled:opacity-50"
                    >
                      结束面试
                    </button>
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={!answer.trim()}
                      className="px-4 py-1.5 bg-primary text-on-primary rounded-lg font-body-md hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
                    >
                      提交回答
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* All questions done - show finish prompt */}
            {!loading && !currentTurn && session.status === 'active' && (
              <div className="p-4 border-t border-border-subtle text-center">
                <p className="font-body-md text-text-secondary mb-3">所有问题已完成！</p>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-body-md hover:bg-on-primary-fixed-variant transition-colors"
                >
                  查看面试报告
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 p-3 bg-risk-high/10 border border-risk-high/30 rounded-lg">
              <p className="font-body-md text-risk-high">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Finished Phase - Report */}
      {phase === 'finished' && session && finalReport && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Score + Summary */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-6 mb-6">
              <div className={`w-20 h-20 rounded-full border-4 ${Number(finalReport.average_score) >= 80 ? 'border-risk-low' : Number(finalReport.average_score) >= 60 ? 'border-risk-medium' : 'border-risk-high'} flex items-center justify-center shrink-0`}>
                <div className="text-center">
                  <span className="font-h1 text-h1 text-primary font-bold">{finalReport.average_score as number}</span>
                  <p className="font-body-sm text-text-secondary">综合评分</p>
                </div>
              </div>
              <div>
                <h3 className="font-h3 text-h3 text-primary mb-1">面试完成</h3>
                <p className="font-body-md text-text-secondary mb-1">共 {finalReport.total_turns as number} 轮对话</p>
                {Boolean(finalReport.overall_comment) && (
                  <p className="font-body-md text-text-primary">{finalReport.overall_comment as string}</p>
                )}
              </div>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(finalReport.strengths_summary as string[] || []).length > 0 && (
                <div className="p-4 rounded-lg bg-risk-low/5 border border-risk-low/20">
                  <h4 className="font-body-md text-risk-low font-medium mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                    核心优势
                  </h4>
                  <ul className="space-y-1">
                    {(finalReport.strengths_summary as string[]).map((s, i) => (
                      <li key={i} className="font-body-sm text-text-secondary">- {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(finalReport.areas_to_improve as string[] || []).length > 0 && (
                <div className="p-4 rounded-lg bg-risk-medium/5 border border-risk-medium/20">
                  <h4 className="font-body-md text-risk-medium font-medium mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span>
                    需要改进
                  </h4>
                  <ul className="space-y-1">
                    {(finalReport.areas_to_improve as string[]).map((s, i) => (
                      <li key={i} className="font-body-sm text-text-secondary">- {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Risks */}
            {(finalReport.risk_flags as string[] || []).length > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-risk-high/5 border border-risk-high/20">
                <h4 className="font-body-md text-risk-high font-medium mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  高风险提醒
                </h4>
                <ul className="space-y-1">
                  {(finalReport.risk_flags as string[]).map((s, i) => (
                    <li key={i} className="font-body-sm text-text-secondary">- {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preparation Advice */}
            {(finalReport.preparation_advice as string[] || []).length > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-agent-accent/5 border border-agent-accent/20">
                <h4 className="font-body-md text-agent-accent font-medium mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">lightbulb</span>
                  准备建议
                </h4>
                <ul className="space-y-1">
                  {(finalReport.preparation_advice as string[]).map((s, i) => (
                    <li key={i} className="font-body-sm text-text-secondary">- {s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Turn-by-turn details */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-5 shadow-sm">
            <h3 className="font-body-md font-medium text-text-primary mb-4">各轮对话详情</h3>
            <div className="space-y-4">
              {completedTurns.map((t, i) => (
                <div key={t.id} className="border border-border-subtle rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-surface flex items-center gap-2">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">第{i + 1}轮</span>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${scoreBg(t.score)} ${scoreColor(t.score)}`}>
                      {t.score}分
                    </span>
                    <span className="font-label-caps text-label-caps text-agent-accent">{questionTypeLabels[t.question_type] || t.question_type}</span>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <p className="font-body-sm text-text-primary"><span className="text-on-surface-variant">问：</span>{t.question}</p>
                    {t.user_answer && (
                      <p className="font-body-sm text-text-secondary"><span className="text-on-surface-variant">答：</span>{t.user_answer}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setSession(null); setPhase('setup'); setAnswer(''); setError(null) }}
              className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-body-md hover:bg-on-primary-fixed-variant transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              开始新面试
            </button>
            <button
              onClick={() => { setSession(null); setPhase('setup'); setAnswer(''); setError(null) }}
              className="px-6 py-2.5 border border-border-subtle text-text-primary rounded-lg font-body-md hover:bg-surface-container-low transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">edit_note</span>
              去润色简历
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
