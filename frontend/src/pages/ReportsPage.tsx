import { useState, useEffect } from 'react'
import { listReports, deleteReport, type ReportListItem } from '../api/reports'
import { getMatch, type MatchReportDetail } from '../api/matches'

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<MatchReportDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    setLoading(true)
    try {
      const data = await listReports()
      setReports(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleView = async (reportId: string) => {
    setDetailLoading(true)
    try {
      const detail = await getMatch(reportId)
      setSelected(detail)
    } catch {
      // ignore
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDelete = async (reportId: string) => {
    try {
      await deleteReport(reportId)
      setReports((prev) => prev.filter((r) => r.id !== reportId))
      if (selected?.report_id === reportId) setSelected(null)
    } catch {
      // ignore
    }
  }

  return (
    <div className="max-w-container-max-width mx-auto w-full">
      <header className="mb-6">
        <h2 className="font-h2 text-h2 font-bold text-text-primary">历史报告</h2>
        <p className="font-body-md text-text-secondary mt-1">管理您的求职准备资产，回顾 AI 深度分析报告。</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-gutter">
        {/* Left: Report List */}
        <div className="w-full lg:w-7/12">
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border-subtle bg-surface-muted">
              <h3 className="font-h3 text-h3 text-primary">报告列表</h3>
            </div>
            {loading ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined animate-spin text-agent-accent text-2xl">progress_activity</span>
                <p className="font-body-md text-on-surface-variant mt-2">加载中...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-on-primary-container mb-3">folder_open</span>
                <p className="font-body-md text-on-surface-variant">暂无报告</p>
                <p className="font-body-sm text-on-surface-variant mt-1">完成匹配分析后，报告将自动保存在此处</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle text-on-surface-variant font-label-caps text-label-caps bg-surface-muted/50">
                    <th className="px-5 py-3 font-medium">报告信息</th>
                    <th className="px-5 py-3 font-medium">AI 评分</th>
                    <th className="px-5 py-3 font-medium">生成日期</th>
                    <th className="px-5 py-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm text-on-surface">
                  {reports.map((r) => (
                    <tr key={r.id} className="border-b border-border-subtle hover:bg-surface-muted transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-primary">{r.report_type === 'match' ? '匹配分析' : r.report_type}</p>
                      </td>
                      <td className="px-5 py-4">
                        {r.overall_score != null ? (
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${r.overall_score >= 80 ? 'bg-risk-low' : r.overall_score >= 60 ? 'bg-risk-medium' : 'bg-risk-high'}`} />
                            <span>{r.overall_score}分</span>
                          </div>
                        ) : (
                          <span className="text-on-surface-variant">--</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-on-surface-variant">{new Date(r.created_at).toLocaleDateString('zh-CN')}</td>
                      <td className="px-5 py-4 text-right flex gap-2 justify-end">
                        <button onClick={() => handleView(r.id)} className="text-agent-accent hover:text-primary transition-colors font-status">查看</button>
                        <button onClick={() => handleDelete(r.id)} className="text-on-surface-variant hover:text-risk-high transition-colors font-status">删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Report Summary */}
        <div className="w-full lg:w-5/12">
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
            <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-4">报告摘要</h3>
            {detailLoading ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined animate-spin text-agent-accent text-2xl">progress_activity</span>
              </div>
            ) : selected ? (
              <div className="space-y-6">
                <div>
                  <h4 className="font-h3 text-h3 text-primary mb-3">整体评价</h4>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-16 h-16 rounded-full border-4 border-agent-accent flex items-center justify-center">
                      <span className="font-h2 text-h2 text-primary font-bold">{selected.overall_score}</span>
                    </div>
                    <div>
                      <p className="font-body-md text-text-primary">综合评分</p>
                      <p className="font-body-sm text-text-secondary">
                        技能{selected.skill_score} / 项目{selected.project_score} / 经验{selected.experience_score} / 表达{selected.expression_score}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-body-md text-risk-low font-medium mb-2">核心优势</h4>
                    <ul className="space-y-1">
                      {selected.strengths.slice(0, 3).map((s, i) => (
                        <li key={i} className="font-body-sm text-text-secondary flex items-start gap-1">
                          <span className="material-symbols-outlined text-risk-low text-[14px]">check</span>
                          {s.title || s.evidence}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-body-md text-risk-high font-medium mb-2">关键差距</h4>
                    <ul className="space-y-1">
                      {selected.weaknesses.slice(0, 3).map((w, i) => (
                        <li key={i} className="font-body-sm text-text-secondary flex items-start gap-1">
                          <span className="material-symbols-outlined text-risk-high text-[14px]">close</span>
                          {w.title || w.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {selected.missing_keywords.length > 0 && (
                  <div>
                    <h4 className="font-body-md text-risk-medium font-medium mb-2">缺失关键词</h4>
                    <div className="flex flex-wrap gap-1">
                      {selected.missing_keywords.map((kw) => (
                        <span key={kw} className="px-2 py-0.5 bg-risk-medium/10 text-risk-medium rounded text-xs">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="font-body-sm text-on-surface-variant">点击左侧报告的「查看」按钮查看详情</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
