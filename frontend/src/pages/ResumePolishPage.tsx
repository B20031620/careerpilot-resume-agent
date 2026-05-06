export default function ResumePolishPage() {
  const suggestions = [
    {
      id: 1,
      risk: 'low' as const,
      section: '工作经历',
      original: '负责公司内部管理系统的开发和维护',
      suggested: '主导内部管理系统重构，将系统响应时间优化 40%，支撑 200+ 日常活跃用户',
    },
    {
      id: 2,
      risk: 'medium' as const,
      section: '技能栈',
      original: '熟悉 LangChain',
      suggested: '基于 LangChain 构建多轮对话 Agent，实现简历自动结构化解析，准确率达 92%',
    },
    {
      id: 3,
      risk: 'high' as const,
      section: '项目经历',
      original: '参与了 AI 客服系统的开发',
      suggested: '独立设计并实现 AI 客服核心对话引擎，日均处理 5000+ 会话，客户满意度提升 25%',
    },
  ]

  const riskColors = {
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

      <div className="flex flex-col lg:flex-row gap-gutter">
        {/* Left: Resume */}
        <div className="w-full lg:w-1/2">
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-h3 text-h3 font-semibold text-text-primary">当前简历版本 (v2_Draft)</h3>
              <span className="font-body-sm text-text-secondary">3 处待优化</span>
            </div>
            <div className="space-y-4">
              {suggestions.map((s) => (
                <div key={s.id} className={`p-3 rounded-lg border border-border-subtle ${s.risk === 'high' ? 'bg-risk-high/5 border-risk-high/30' : 'bg-surface'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">{s.section}</span>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${riskColors[s.risk].bg} ${riskColors[s.risk].text}`}>
                      风险: {riskColors[s.risk].label}
                    </span>
                  </div>
                  <p className="font-body-md text-on-surface-variant line-through">{s.original}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Suggestions */}
        <div className="w-full lg:w-1/2">
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-h3 text-h3 font-semibold text-text-primary">AI 优化建议 (3)</h3>
              <button className="text-agent-accent hover:text-primary font-status text-status">全部接受</button>
            </div>
            <div className="space-y-4">
              {suggestions.map((s) => (
                <div key={s.id} className="border border-border-subtle rounded-lg p-4 bg-surface">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">{s.section}</span>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${riskColors[s.risk].bg} ${riskColors[s.risk].text}`}>
                      风险: {riskColors[s.risk].label}
                    </span>
                  </div>
                  <p className="font-body-md text-text-primary mb-3">{s.suggested}</p>
                  {s.risk === 'high' && (
                    <p className="font-body-sm text-risk-high mb-3 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                      需要人工确认
                    </p>
                  )}
                  <div className="flex gap-2">
                    {s.risk === 'high' ? (
                      <>
                        <button className="px-3 py-1.5 bg-risk-low text-on-primary rounded font-body-sm text-body-sm">确认属实并接受</button>
                        <button className="px-3 py-1.5 bg-surface-container border border-border-subtle rounded font-body-sm text-body-sm text-text-primary">改为保守表达</button>
                        <button className="px-3 py-1.5 text-risk-high font-body-sm text-body-sm">拒绝</button>
                      </>
                    ) : (
                      <>
                        <button className="px-3 py-1.5 bg-risk-low text-on-primary rounded font-body-sm text-body-sm">接受</button>
                        <button className="px-3 py-1.5 bg-surface-container border border-border-subtle rounded font-body-sm text-body-sm text-text-primary">编辑</button>
                        <button className="px-3 py-1.5 text-on-surface-variant font-body-sm text-body-sm">忽略</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 bg-primary text-on-primary font-body-md py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-colors">
              <span className="material-symbols-outlined text-sm">download</span>
              导出新版本简历
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
