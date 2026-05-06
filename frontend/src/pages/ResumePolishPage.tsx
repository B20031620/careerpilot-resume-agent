import { useState, useEffect } from 'react'
import { listResumes, type ResumeListItem } from '../api/resumes'
import { listJobs, type JobListItem } from '../api/jobs'
import { createMatch, type MatchReportDetail } from '../api/matches'
import { ApiError } from '../api/client'

export default function ResumePolishPage() {
  const [resumes, setResumes] = useState<ResumeListItem[]>([])
  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<MatchReportDetail | null>(null)

  useEffect(() => {
    listResumes().then(setResumes).catch(() => {})
    listJobs().then(setJobs).catch(() => {})
  }, [])

  const handleGenerate = async () => {
    if (!selectedResumeId || !selectedJobId) return
    setLoading(true)
    setError(null)
    try {
      const result = await createMatch({ resume_id: selectedResumeId, job_id: selectedJobId })
      setReport(result)
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.detail)
      } else {
        setError('生成建议失败，请检查后端服务')
      }
    } finally {
      setLoading(false)
    }
  }

  const suggestions = report?.suggestions ?? []
  const riskColors: Record<string, { bg: string; text: string; label: string }> = {
    low: { bg: 'bg-risk-low/10', text: 'text-risk-low', label: '低' },
    medium: { bg: 'bg-risk-medium/10', text: 'text-risk-medium', label: '中' },
    high: { bg: 'bg-risk-high/10', text: 'text-risk-high', label: '高' },
  }

  return (
    <div className="max-w-container-max-width mx-auto w-full">
      <header className="mb-6">
        <h2 className="font-h2 text-h2 font-bold text-text-primary">简历润色</h2>
        <p className="font-body-md text-text-secondary mt-1">逐条处理 AI 优化建议，打造高匹配度简历</p>
      </header>

      {/* Resume + Job selection */}
      <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block font-body-md text-text-primary font-medium mb-1">选择简历</label>
            <select
              className="w-full px-3 py-2 border border-border-subtle rounded-lg font-body-md text-text-primary bg-surface focus:outline-none focus:border-agent-accent"
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
            >
              <option value="">-- 请选择 --</option>
              {resumes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block font-body-md text-text-primary font-medium mb-1">选择岗位 JD</label>
            <select
              className="w-full px-3 py-2 border border-border-subtle rounded-lg font-body-md text-text-primary bg-surface focus:outline-none focus:border-agent-accent"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
            >
              <option value="">-- 请选择 --</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}{j.company_name ? ` @ ${j.company_name}` : ''}</option>)}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || !selectedResumeId || !selectedJobId}
            className="px-5 py-2.5 bg-primary text-on-primary rounded-lg font-status text-status flex items-center gap-2 hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">{loading ? 'hourglass_top' : 'psychology'}</span>
            {loading ? '生成中...' : '生成润色建议'}
          </button>
        </div>
        {error && (
          <div className="mt-3 p-3 bg-risk-high/10 border border-risk-high/30 rounded-lg">
            <p className="font-body-md text-risk-high">{error}</p>
          </div>
        )}
      </div>

      {report && (
        <div className="flex flex-col lg:flex-row gap-gutter">
          {/* Left: Current Resume */}
          <div className="w-full lg:w-1/2">
            <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-h3 text-h3 font-semibold text-text-primary">当前简历原文</h3>
                <span className="font-body-sm text-text-secondary">{suggestions.length} 处待优化</span>
              </div>
              <div className="space-y-4">
                {suggestions.map((s, i) => {
                  const risk = (s.risk_level as string) || 'low'
                  return (
                    <div key={i} className={`p-3 rounded-lg border ${risk === 'high' ? 'bg-risk-high/5 border-risk-high/30' : 'bg-surface border-border-subtle'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-label-caps text-label-caps text-on-surface-variant">{s.section || '未指定模块'}</span>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${riskColors[risk]?.bg || ''} ${riskColors[risk]?.text || ''}`}>
                          风险: {riskColors[risk]?.label || risk}
                        </span>
                      </div>
                      <p className="font-body-md text-on-surface-variant line-through">{String(s.original_text || '')}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right: Suggestions */}
          <div className="w-full lg:w-1/2">
            <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-h3 text-h3 font-semibold text-text-primary">AI 优化建议 ({suggestions.length})</h3>
              </div>
              <div className="space-y-4">
                {suggestions.map((s, i) => {
                  const risk = (s.risk_level as string) || 'low'
                  return (
                    <div key={i} className="border border-border-subtle rounded-lg p-4 bg-surface">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-label-caps text-label-caps text-on-surface-variant">{s.section || '未指定模块'}</span>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${riskColors[risk]?.bg || ''} ${riskColors[risk]?.text || ''}`}>
                          风险: {riskColors[risk]?.label || risk}
                        </span>
                      </div>
                      {s.issue && <p className="font-body-sm text-risk-medium mb-2">问题: {String(s.issue)}</p>}
                      <p className="font-body-md text-text-primary mb-2">{String(s.revised_text || '')}</p>
                      {s.rationale && <p className="font-body-sm text-on-surface-variant">理由: {String(s.rationale)}</p>}
                      {risk === 'high' && (
                        <p className="font-body-sm text-risk-high mt-2 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">warning</span>
                          需要人工确认
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {!report && !error && (
        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <span className="material-symbols-outlined text-5xl text-on-primary-container mb-3">edit_note</span>
            <p className="font-body-md text-text-secondary">选择简历和岗位后生成润色建议</p>
            <p className="font-body-sm text-on-surface-variant mt-2">请使用 USE_MOCK_LLM=true 启动后端以在本地演示</p>
          </div>
        </div>
      )}
    </div>
  )
}
