import { useState, useEffect } from 'react'
import { ApiError } from '../api/client'
import { listResumes, type ResumeListItem } from '../api/resumes'
import { createJob } from '../api/jobs'
import { createMatch, type MatchReportDetail } from '../api/matches'
import { getCurrentResumeId, onCurrentResumeChange, setCurrentResumeId } from '../utils/currentResume'

export default function JobMatchPage() {
  const [resumes, setResumes] = useState<ResumeListItem[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [jdTitle, setJdTitle] = useState('')
  const [jdCompany, setJdCompany] = useState('')
  const [jdText, setJdText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<MatchReportDetail | null>(null)

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
    return onCurrentResumeChange(setSelectedResumeId)
  }, [])

  const handleMatch = async () => {
    if (!selectedResumeId || !jdTitle.trim() || !jdText.trim()) return
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const job = await createJob({ title: jdTitle.trim(), company_name: jdCompany.trim() || undefined, raw_text: jdText })
      const matchResult = await createMatch({ resume_id: selectedResumeId, job_id: job.id })
      setReport(matchResult)
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.detail)
      } else {
        setError('匹配分析失败，请检查后端服务是否启动')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-container-max-width mx-auto w-full">
      <header className="mb-6">
        <h2 className="font-h2 text-h2 font-bold text-text-primary">岗位匹配</h2>
        <p className="font-body-md text-text-secondary mt-1">输入目标岗位 JD，获取 AI 深度匹配报告与优化策略。</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-gutter">
        {/* Left: Input */}
        <div className="w-full lg:w-5/12 flex flex-col gap-stack-gap">
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
            <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-4">已选简历</h3>
            {resumes.length === 0 ? (
              <p className="font-body-sm text-on-surface-variant mb-4">暂无简历，请先在「上传/分析」页面创建</p>
            ) : (
              <select
                className="w-full px-3 py-2 border border-border-subtle rounded-lg font-body-md text-text-primary bg-surface focus:outline-none focus:border-agent-accent mb-4"
                value={selectedResumeId}
                onChange={(e) => {
                  setSelectedResumeId(e.target.value)
                  setCurrentResumeId(e.target.value)
                }}
              >
                <option value="">-- 请选择简历 --</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            )}

            <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-3">目标岗位 JD</h3>
            <input
              className="w-full px-3 py-2 border border-border-subtle rounded-lg font-body-md text-text-primary bg-surface focus:outline-none focus:border-agent-accent mb-3"
              placeholder="岗位名称，例如：高级AI工程师"
              value={jdTitle}
              onChange={(e) => setJdTitle(e.target.value)}
            />
            <input
              className="w-full px-3 py-2 border border-border-subtle rounded-lg font-body-md text-text-primary bg-surface focus:outline-none focus:border-agent-accent mb-3"
              placeholder="公司名称（可选）"
              value={jdCompany}
              onChange={(e) => setJdCompany(e.target.value)}
            />
            <textarea
              className="w-full h-48 border border-border-subtle rounded-lg p-3 font-body-md text-text-primary bg-surface resize-none focus:outline-none focus:border-agent-accent"
              placeholder="请粘贴目标岗位的职位描述（JD）..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />

            {error && (
              <div className="mt-3 p-3 bg-risk-high/10 border border-risk-high/30 rounded-lg">
                <p className="font-body-md text-risk-high">{error}</p>
              </div>
            )}

            <button
              onClick={handleMatch}
              disabled={loading || !selectedResumeId || !jdTitle.trim() || !jdText.trim()}
              className="w-full mt-4 bg-primary text-on-primary font-body-md py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">{loading ? 'hourglass_top' : 'target'}</span>
              {loading ? '正在分析...' : '开始深度匹配'}
            </button>
            <p className="font-body-sm text-on-surface-variant mt-2 text-center">
              此处默认使用顶部选择的当前简历，您也可以临时切换另一份简历。
            </p>
          </div>
        </div>

        {/* Right: Report */}
        <div className="w-full lg:w-7/12 flex flex-col gap-stack-gap">
          {report ? (
            <>
              {/* Score Card */}
              <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
                <div className="flex items-center gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-full border-4 border-agent-accent flex items-center justify-center">
                      <div className="text-center">
                        <span className="font-h1 text-h1 text-primary font-bold">{report.overall_score}</span>
                        <p className="font-body-sm text-text-secondary">匹配度</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-h3 text-h3 text-primary mb-1">
                      匹配度{report.overall_score >= 80 ? '良好' : report.overall_score >= 60 ? '中等' : '偏低'}，{report.overall_score >= 80 ? '具备核心竞争力' : '有提升空间'}
                    </h3>
                    <p className="font-body-md text-text-secondary">报告 ID: {report.report_id}</p>
                  </div>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: '技能匹配', score: report.skill_score },
                  { label: '项目匹配', score: report.project_score },
                  { label: '经验匹配', score: report.experience_score },
                  { label: '表达质量', score: report.expression_score },
                ].map((item) => (
                  <div key={item.label} className="bg-surface-container-lowest border border-border-subtle rounded-xl p-4 shadow-sm">
                    <p className="font-body-sm text-text-secondary mb-1">{item.label}</p>
                    <span className="font-h2 text-h2 text-primary">{item.score}</span>
                    <div className="mt-2 h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.score >= 80 ? 'bg-risk-low' : item.score >= 60 ? 'bg-risk-medium' : 'bg-risk-high'}`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
                  <h3 className="font-h3 text-h3 text-primary mb-3">核心优势</h3>
                  <ul className="space-y-2">
                    {report.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-risk-low text-[16px] mt-0.5">check_circle</span>
                        <span className="font-body-md text-text-primary">{s.title || s.evidence}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
                  <h3 className="font-h3 text-h3 text-primary mb-3">关键差距</h3>
                  <ul className="space-y-2">
                    {report.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-risk-high text-[16px] mt-0.5">error</span>
                        <span className="font-body-md text-text-primary">{w.title || w.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Missing Keywords */}
              {report.missing_keywords.length > 0 && (
                <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
                  <h3 className="font-h3 text-h3 text-primary mb-3">缺失关键词侦测</h3>
                  <div className="flex flex-wrap gap-2">
                    {report.missing_keywords.map((kw) => (
                      <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 bg-risk-medium/10 text-risk-medium rounded font-body-sm">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm flex-1 flex items-center justify-center">
              <div className="text-center">
                <span className="material-symbols-outlined text-5xl text-on-primary-container mb-3">target</span>
                <p className="font-body-md text-text-secondary">选择简历并输入 JD 后，匹配报告将在此处展示</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
