import { useState, useEffect } from 'react'
import { listResumes, type ResumeListItem } from '../api/resumes'
import { polishResume, type PolishResult, type PolishSuggestion } from '../api/polish'
import { ApiError } from '../api/client'
import { getCurrentResumeId, onCurrentResumeChange, setCurrentResumeId } from '../utils/currentResume'

const riskConfig: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-risk-low/10', text: 'text-risk-low', label: '措辞优化' },
  medium: { bg: 'bg-risk-medium/10', text: 'text-risk-medium', label: '补充数据' },
  high: { bg: 'bg-risk-high/10', text: 'text-risk-high', label: '补充经历' },
}

function SuggestionCard({ s, index }: { s: PolishSuggestion; index: number }) {
  const risk = riskConfig[s.risk_level] || riskConfig.low
  return (
    <div className="bg-surface-container-lowest border border-border-subtle rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border-subtle flex items-center gap-3">
        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
          {index + 1}
        </span>
        <span className="font-body-md text-text-primary font-medium">{s.section || '未指定模块'}</span>
        <span className={`ml-auto px-2 py-0.5 rounded font-body-sm text-xs ${risk.bg} ${risk.text}`}>
          {risk.label}
        </span>
      </div>
      <div className="px-5 py-4 space-y-3">
        {/* Original vs Revised */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-risk-high/5 border border-risk-high/20">
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">原文</p>
            <p className="font-body-md text-on-surface-variant line-through">{s.original_text}</p>
          </div>
          <div className="p-3 rounded-lg bg-risk-low/5 border border-risk-low/20">
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">修改建议</p>
            <p className="font-body-md text-text-primary">{s.revised_text}</p>
          </div>
        </div>
        {/* Issue */}
        <div>
          <span className="font-label-caps text-label-caps text-risk-medium">问题</span>
          <p className="font-body-sm text-text-secondary mt-0.5">{s.issue}</p>
        </div>
        {/* Rationale */}
        <div>
          <span className="font-label-caps text-label-caps text-agent-accent">理由</span>
          <p className="font-body-sm text-text-secondary mt-0.5">{s.rationale}</p>
        </div>
        {s.risk_level === 'high' && (
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-risk-high/5">
            <span className="material-symbols-outlined text-[14px] text-risk-high">warning</span>
            <span className="font-body-sm text-risk-high">此建议需要补充真实经历，请人工确认</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ResumePolishPage() {
  const [resumes, setResumes] = useState<ResumeListItem[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [jdText, setJdText] = useState('')
  const [jdOpen, setJdOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PolishResult | null>(null)

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
    return onCurrentResumeChange(setSelectedResumeId)
  }, [])

  const handlePolish = async () => {
    if (!selectedResumeId) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await polishResume(selectedResumeId, jdOpen && jdText.trim() ? jdText.trim() : undefined)
      setResult(data)
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.detail)
      } else {
        setError('润色失败，请检查后端服务')
      }
    } finally {
      setLoading(false)
    }
  }

  const suggestionCount = result?.suggestions.length ?? 0
  const riskSummary = result ? result.suggestions.reduce(
    (acc, s) => { acc[s.risk_level] = (acc[s.risk_level] || 0) + 1; return acc },
    {} as Record<string, number>,
  ) : {}

  return (
    <div className="max-w-container-max-width mx-auto w-full">
      <header className="mb-6">
        <h2 className="font-h2 text-h2 font-bold text-text-primary">AI 润色</h2>
        <p className="font-body-md text-text-secondary mt-1">AI 分析简历问题，逐条给出优化建议</p>
      </header>

      {/* Config Panel */}
      <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-5 shadow-sm mb-6">
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
              <option value="">-- 请选择 --</option>
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
            有目标岗位？粘贴 JD 让润色更有针对性
          </button>
          {jdOpen && (
            <div className="mt-2">
              <textarea
                className="w-full px-3 py-2 border border-border-subtle rounded-lg font-body-md text-text-primary bg-surface focus:outline-none focus:border-agent-accent resize-y"
                rows={4}
                placeholder="粘贴目标岗位的职位描述..."
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Polish button */}
        <button
          onClick={handlePolish}
          disabled={loading || !selectedResumeId}
          className="w-full py-2.5 bg-primary text-on-primary rounded-lg font-status text-status flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-sm">{loading ? 'progress_activity' : 'auto_fix_high'}</span>
          {loading ? 'AI 正在分析...' : '开始 AI 润色'}
        </button>

        {error && (
          <div className="mt-3 p-3 bg-risk-high/10 border border-risk-high/30 rounded-lg">
            <p className="font-body-md text-risk-high">{error}</p>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-8 shadow-sm text-center mb-6">
          <span className="material-symbols-outlined text-3xl text-agent-accent animate-spin">progress_activity</span>
          <p className="font-body-md text-text-primary mt-3">AI 正在分析您的简历</p>
          <p className="font-body-sm text-on-surface-variant mt-1">分析简历中的表达问题，生成优化建议...</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Summary bar */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-agent-accent">check_circle</span>
                <span className="font-body-md text-text-primary font-medium">
                  共 {suggestionCount} 条优化建议
                </span>
              </div>
              {Object.entries(riskSummary).map(([level, count]) => {
                const cfg = riskConfig[level]
                if (!cfg) return null
                return (
                  <span key={level} className={`px-2.5 py-1 rounded-lg font-body-sm ${cfg.bg} ${cfg.text}`}>
                    {cfg.label} {count}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Suggestion cards */}
          <div className="space-y-4">
            {result.suggestions.map((s, i) => (
              <SuggestionCard key={i} s={s} index={i} />
            ))}
          </div>

          {/* Overall assessment */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary">summarize</span>
              <h3 className="font-body-md font-medium text-text-primary">整体评价</h3>
            </div>
            <p className="font-body-md text-text-secondary leading-relaxed">{result.overall_assessment}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-10 shadow-sm text-center">
          <span className="material-symbols-outlined text-5xl text-on-primary-container mb-3">auto_fix_high</span>
          <p className="font-body-md text-text-secondary mb-1">选择简历，AI 为您逐条优化</p>
          <p className="font-body-sm text-on-surface-variant">AI 会分析表达问题、缺少数据、经历不足等，给出具体修改建议</p>
        </div>
      )}
    </div>
  )
}
