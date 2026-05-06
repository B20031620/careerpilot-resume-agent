export default function ProjectStoryPage() {
  return (
    <div className="max-w-container-max-width mx-auto w-full">
      <header className="mb-6">
        <h2 className="font-h2 text-h2 font-bold text-text-primary">项目包装</h2>
        <p className="font-body-md text-text-secondary mt-1">
          将简历项目转化为面试中的精彩故事，建立系统性的表达逻辑。
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-gutter">
        {/* Left: Context */}
        <div className="w-full lg:w-5/12 space-y-stack-gap">
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
            <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-4">当前处理项目</h3>
            <div className="p-3 border border-border-subtle rounded-lg bg-surface-muted">
              <p className="font-body-md text-text-primary font-medium">AI 智能客服系统</p>
              <p className="font-body-sm text-text-secondary mt-1">2023.06 - 2023.12</p>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
            <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-4">项目事实检查</h3>
            <ul className="space-y-3">
              {[
                { label: '项目背景与目标', done: true },
                { label: '您的具体职责', done: true },
                { label: '技术选型理由', done: false },
                { label: '量化成果数据', done: false },
                { label: '遇到的挑战', done: false },
              ].map((item) => (
                <li key={item.label} className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-[18px] ${item.done ? 'text-risk-low' : 'text-on-surface-variant'}`}>
                    {item.done ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                  <span className={`font-body-md ${item.done ? 'text-text-primary' : 'text-on-surface-variant'}`}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
            <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-4">AI 深度挖掘</h3>
            <textarea
              className="w-full h-24 border border-border-subtle rounded-lg p-3 font-body-md text-text-primary bg-surface resize-none focus:outline-none focus:border-agent-accent"
              placeholder="向 AI 补充项目的细节信息..."
            />
            <button className="mt-3 px-4 py-2 bg-primary text-on-primary rounded-lg font-body-md flex items-center gap-2 hover:bg-on-primary-fixed-variant transition-colors">
              <span className="material-symbols-outlined text-sm">psychology</span>
              补充事实
            </button>
          </div>
        </div>

        {/* Right: STAR Story */}
        <div className="w-full lg:w-7/12 space-y-stack-gap">
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
            <div className="flex items-center gap-4 mb-6 border-b border-border-subtle pb-4">
              {['STAR 版本', '30秒版本', '2分钟版本', '技术亮点'].map((tab, i) => (
                <button
                  key={tab}
                  className={`px-3 py-2 font-body-md ${i === 0 ? 'text-primary border-b-2 border-primary font-medium' : 'text-on-surface-variant hover:text-primary transition-colors'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {[
                { label: '情景 (Situation)', icon: 'location_on', content: '公司传统客服团队人力成本高，日均处理 3000+ 咨询，响应时间超过 5 分钟，客户投诉率持续上升。' },
                { label: '任务 (Task)', icon: 'assignment', content: '负责设计并实现 AI 智能客服系统，目标将人工客服工作量降低 60%，首次响应时间缩短至 30 秒以内。' },
                { label: '行动 (Action)', icon: 'directions_run', content: '基于 LangChain + DeepSeek 构建多轮对话 Agent，实现意图识别、知识库检索和智能回答生成。设计对话流程编排引擎，支持 10+ 业务场景自动路由。' },
                { label: '结果 (Result)', icon: 'emoji_events', content: '系统上线后日均处理 5000+ 会话，人工客服工作量降低 65%，客户满意度从 72% 提升至 89%。项目获得公司年度技术创新奖。' },
              ].map((item) => (
                <div key={item.label} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-agent-accent/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-agent-accent text-sm">{item.icon}</span>
                  </div>
                  <div>
                    <p className="font-h3 text-h3 text-primary mb-1">{item.label}</p>
                    <p className="font-body-md text-text-secondary">{item.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mock Questions */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
            <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-4">模拟深度追问</h3>
            <div className="space-y-3">
              {['为什么选择 LangChain 而不是直接调用 API？', '系统如何处理超出知识库范围的问题？', '65% 的工作量降低是如何量化的？'].map((q, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-border-subtle rounded-lg bg-surface">
                  <p className="font-body-md text-text-primary">{q}</p>
                  <button className="text-agent-accent hover:text-primary font-status text-status">练习回答</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
