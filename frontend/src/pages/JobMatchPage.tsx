export default function JobMatchPage() {
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
            <div className="flex items-center gap-3 p-3 border border-border-subtle rounded-lg bg-surface-muted mb-6">
              <span className="material-symbols-outlined text-secondary">description</span>
              <div>
                <p className="font-body-md text-text-primary">个人简历_v3_优化版.pdf</p>
                <p className="font-body-sm text-text-secondary">综合评分 82/100</p>
              </div>
            </div>

            <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-4">目标岗位 JD</h3>
            <textarea
              className="w-full h-48 border border-border-subtle rounded-lg p-3 font-body-md text-text-primary bg-surface resize-none focus:outline-none focus:border-agent-accent"
              placeholder="请粘贴目标岗位的职位描述（JD）..."
            />
            <button className="w-full mt-4 bg-primary text-on-primary font-body-md py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-colors">
              <span className="material-symbols-outlined text-sm">target</span>
              开始深度匹配
            </button>
          </div>
        </div>

        {/* Right: Report */}
        <div className="w-full lg:w-7/12 flex flex-col gap-stack-gap">
          {/* Score Card */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full border-4 border-agent-accent flex items-center justify-center">
                  <div className="text-center">
                    <span className="font-h1 text-h1 text-primary font-bold">82</span>
                    <p className="font-body-sm text-text-secondary">匹配度</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-h3 text-h3 text-primary mb-1">匹配度良好，具备核心竞争力</h3>
                <p className="font-body-md text-text-secondary">AI 综合评估了技能、经验和项目三个维度，整体匹配度较高。</p>
              </div>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: '技能匹配', score: 85, color: 'bg-risk-low' },
              { label: '经验匹配', score: 78, color: 'bg-risk-medium' },
              { label: '项目匹配', score: 82, color: 'bg-risk-low' },
            ].map((item) => (
              <div key={item.label} className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
                <p className="font-body-sm text-text-secondary mb-2">{item.label}</p>
                <span className="font-h2 text-h2 text-primary">{item.score}%</span>
                <div className="mt-3 h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.score}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
              <h3 className="font-h3 text-h3 text-primary mb-3">核心优势</h3>
              <ul className="space-y-2">
                {['技术栈高度匹配', '项目经验丰富', '有 AI Agent 开发经验'].map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-risk-low text-[16px] mt-0.5">check_circle</span>
                    <span className="font-body-md text-text-primary">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
              <h3 className="font-h3 text-h3 text-primary mb-3">关键差距</h3>
              <ul className="space-y-2">
                {['缺少大规模系统设计经验', '团队管理经验不足', '缺少量化成果数据'].map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-risk-high text-[16px] mt-0.5">error</span>
                    <span className="font-body-md text-text-primary">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Missing Keywords */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
            <h3 className="font-h3 text-h3 text-primary mb-3">缺失关键词侦测</h3>
            <div className="flex flex-wrap gap-2">
              {['微服务架构', 'Kubernetes', '技术方案评审', '跨团队协作', 'OKR'].map((kw) => (
                <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 bg-risk-medium/10 text-risk-medium rounded font-body-sm">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button className="px-5 py-2.5 bg-secondary text-on-secondary rounded-lg font-status text-status flex items-center gap-2 hover:bg-on-secondary-fixed-variant transition-colors">
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
              基于此报告润色简历
            </button>
            <button className="px-5 py-2.5 bg-surface-container-lowest border border-border-subtle rounded-lg font-status text-status text-text-primary flex items-center gap-2 hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-[16px]">record_voice_over</span>
              开始岗位模拟面试
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
