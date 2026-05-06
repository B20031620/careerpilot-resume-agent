import { useState, useEffect } from 'react'
import { listResumes } from '../api/resumes'
import { listJobs } from '../api/jobs'
import { listReports, type ReportListItem } from '../api/reports'

export default function DashboardPage() {
  const [resumeCount, setResumeCount] = useState<number | null>(null)
  const [jobCount, setJobCount] = useState<number | null>(null)
  const [reports, setReports] = useState<ReportListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      listResumes().then((r) => setResumeCount(r.length)).catch(() => {}),
      listJobs().then((j) => setJobCount(j.length)).catch(() => {}),
      listReports().then(setReports).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const topScore = reports.reduce<number>((max, r) => {
    if (r.overall_score != null && r.overall_score > max) return r.overall_score
    return max
  }, 0)

  return (
    <div className="max-w-container-max-width mx-auto space-y-stack-gap">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="font-h1 text-h1 text-primary mb-1">工作台</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            欢迎回来，这是您的求职准备状态概览
          </p>
        </div>
      </div>

      {/* Bento Grid: Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="col-span-1 bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="font-body-sm text-body-sm text-on-surface-variant">最高匹配评分</span>
            <span className="material-symbols-outlined text-on-surface-variant text-lg">speed</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="font-h1 text-[40px] leading-none text-primary font-bold">
              {loading ? '--' : topScore > 0 ? topScore : '--'}
            </span>
            {topScore > 0 && (
              <span className="font-body-sm text-body-sm mb-1 font-medium text-risk-low">/100 {topScore >= 80 ? '良好' : topScore >= 60 ? '中等' : '偏低'}</span>
            )}
          </div>
          {topScore > 0 && (
            <div className="mt-4 h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${topScore >= 80 ? 'bg-risk-low' : topScore >= 60 ? 'bg-risk-medium' : 'bg-risk-high'}`}
                style={{ width: `${topScore}%` }}
              />
            </div>
          )}
        </div>

        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-agent-accent text-sm">description</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">已录入简历</span>
          </div>
          <span className="font-h2 text-h2 text-primary">
            {loading ? '--' : resumeCount ?? 0} <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">份</span>
          </span>
        </div>

        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-agent-accent text-sm">work</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">已分析岗位</span>
          </div>
          <span className="font-h2 text-h2 text-primary">
            {loading ? '--' : jobCount ?? 0} <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">个</span>
          </span>
        </div>

        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-risk-medium text-sm">local_fire_department</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">分析报告</span>
          </div>
          <span className="font-h2 text-h2 text-primary">
            {loading ? '--' : reports.length} <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">份</span>
          </span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recommendations & Records */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recommended Next Step */}
          <div className="bg-gradient-to-r from-agent-running/40 to-surface-container-lowest border border-border-subtle rounded-xl p-6 shadow-sm flex items-start justify-between">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-agent-accent/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-agent-accent">lightbulb</span>
              </div>
              <div>
                <h3 className="font-h3 text-h3 text-primary mb-1">推荐下一步</h3>
                {(resumeCount ?? 0) === 0 ? (
                  <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                    还没有录入简历，请先在「简历分析」页面粘贴您的简历，AI 将为您进行深度结构化解析。
                  </p>
                ) : (jobCount ?? 0) === 0 ? (
                  <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                    简历已就绪，建议添加目标岗位 JD 以进行深度的「人岗匹配度分析」。
                  </p>
                ) : reports.length === 0 ? (
                  <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                    简历和岗位已就绪，立即进行深度匹配分析，获取 AI 评分与优化建议。
                  </p>
                ) : (
                  <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                    已有 {reports.length} 份分析报告，可以前往「简历润色」页面逐条处理 AI 优化建议。
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Analysis Records */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border-subtle bg-surface-muted flex justify-between items-center">
              <h3 className="font-h3 text-h3 text-primary">最近分析记录</h3>
            </div>
            {loading ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined animate-spin text-agent-accent text-2xl">progress_activity</span>
              </div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-on-primary-container mb-3">folder_open</span>
                <p className="font-body-md text-on-surface-variant">暂无分析记录</p>
                <p className="font-body-sm text-on-surface-variant mt-1">完成匹配分析后，报告将自动保存在此处</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-subtle text-on-surface-variant font-label-caps text-label-caps bg-surface-muted/50">
                      <th className="px-5 py-3 font-medium">任务名称</th>
                      <th className="px-5 py-3 font-medium">类型</th>
                      <th className="px-5 py-3 font-medium">评分</th>
                      <th className="px-5 py-3 font-medium">时间</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-sm text-body-sm text-on-surface">
                    {reports.slice(0, 5).map((r) => (
                      <tr key={r.id} className="border-b border-border-subtle hover:bg-surface-muted transition-colors">
                        <td className="px-5 py-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-on-surface-variant text-base">description</span>
                          <span className="font-medium text-primary">{r.report_type === 'match' ? '匹配分析' : r.report_type}</span>
                        </td>
                        <td className="px-5 py-4 text-on-surface-variant">{r.report_type === 'match' ? '岗位匹配' : r.report_type}</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Agent Dynamics */}
        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm flex flex-col h-[500px]">
          <div className="px-5 py-4 border-b border-border-subtle bg-surface-muted flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-agent-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-agent-accent" />
            </span>
            <h3 className="font-h3 text-h3 text-primary">Agent 运行动态</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <div className="relative border-l border-border-subtle ml-3 space-y-6 pb-4">
              <div className="relative pl-6">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-agent-running border-2 border-agent-accent z-10" />
                <p className="font-status text-status text-primary mb-0.5">系统就绪</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  CareerPilot Agent 已准备就绪，等待您的分析任务
                </p>
              </div>
              {(resumeCount ?? 0) > 0 && (
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-surface-container-lowest border-2 border-risk-low z-10" />
                  <p className="font-status text-status text-primary mb-0.5">已录入 {resumeCount} 份简历</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">简历数据已就绪，可用于匹配分析</p>
                </div>
              )}
              {(jobCount ?? 0) > 0 && (
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-surface-container-lowest border-2 border-agent-accent z-10" />
                  <p className="font-status text-status text-primary mb-0.5">已录入 {jobCount} 个岗位 JD</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">目标岗位信息已就绪</p>
                </div>
              )}
              {reports.length > 0 && (
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-surface-container-lowest border-2 border-risk-low z-10" />
                  <p className="font-status text-status text-primary mb-0.5">已生成 {reports.length} 份分析报告</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    最高评分 {topScore > 0 ? topScore : '--'} 分
                  </p>
                </div>
              )}
              {reports.length === 0 && (resumeCount ?? 0) > 0 && (jobCount ?? 0) > 0 && (
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-agent-running border-2 border-risk-medium z-10" />
                  <p className="font-status text-status text-primary mb-0.5">建议立即进行匹配分析</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    简历和岗位已就绪，前往「岗位匹配」开始分析
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="p-4 border-t border-border-subtle bg-surface-muted/50 text-center">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              数据实时同步自后端 API
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
