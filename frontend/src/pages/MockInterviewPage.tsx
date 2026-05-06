export default function MockInterviewPage() {
  return (
    <div className="max-w-container-max-width mx-auto w-full">
      <header className="mb-6">
        <h2 className="font-h2 text-h2 font-bold text-text-primary">模拟面试</h2>
        <p className="font-body-md text-text-secondary mt-1">
          基于您的简历与目标岗位，进行多轮实战模拟面试。
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-gutter">
        {/* Left: Interview Plan */}
        <div className="w-full lg:w-3/12">
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
            <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-2">面试类型</h3>
            <p className="font-body-sm text-text-secondary mb-4">技术面 - 高级后端工程师</p>

            <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-3">面试主题大纲</h3>
            <div className="relative border-l-2 border-border-subtle ml-3 space-y-4">
              {[
                { label: '自我介绍', status: 'done' },
                { label: '项目经历深挖', status: 'active' },
                { label: '技术深度考察', status: 'pending' },
                { label: '系统设计题', status: 'pending' },
                { label: '反问环节', status: 'pending' },
              ].map((item, i) => (
                <div key={i} className="relative pl-6">
                  <div
                    className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full z-10 ${
                      item.status === 'done'
                        ? 'bg-risk-low'
                        : item.status === 'active'
                          ? 'bg-agent-running border-2 border-agent-accent'
                          : 'bg-surface-container-lowest border-2 border-border-subtle'
                    }`}
                  />
                  <p className={`font-body-md ${item.status === 'active' ? 'text-primary font-medium' : 'text-on-surface-variant'}`}>
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Chat */}
        <div className="w-full lg:w-5/12 flex flex-col">
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm flex flex-col h-[600px]">
            <div className="px-5 py-4 border-b border-border-subtle bg-surface-muted flex items-center gap-2">
              <span className="material-symbols-outlined text-agent-accent">record_voice_over</span>
              <h3 className="font-h3 text-h3 text-primary">面试官提问</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Interviewer */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-agent-accent/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-agent-accent text-sm">smart_toy</span>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3 max-w-[80%]">
                  <p className="font-body-md text-text-primary">
                    请详细介绍一下你在 AI 智能客服项目中的角色和贡献。你提到"主导"这个项目，能具体说说你是如何推动项目落地的吗？
                  </p>
                </div>
              </div>
              {/* User Answer */}
              <div className="flex gap-3 justify-end">
                <div className="bg-secondary/10 rounded-lg p-3 max-w-[80%]">
                  <p className="font-body-md text-text-primary">
                    我负责了整个对话引擎的设计和实现。使用 LangChain 搭建了多轮对话框架，通过意图识别模块自动路由到不同的业务场景...
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-border-subtle">
              <textarea
                className="w-full h-20 border border-border-subtle rounded-lg p-3 font-body-md text-text-primary bg-surface resize-none focus:outline-none focus:border-agent-accent"
                placeholder="输入您的回答..."
              />
              <div className="flex justify-between mt-2">
                <p className="font-body-sm text-on-surface-variant">提示：回答框架建议采用 STAR 法则</p>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-on-surface-variant font-body-sm text-body-sm">跳过</button>
                  <button className="px-4 py-1.5 bg-primary text-on-primary rounded font-body-md">提交回答</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Feedback */}
        <div className="w-full lg:w-4/12">
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
            <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-4">AI 反馈分析</h3>

            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-risk-medium flex items-center justify-center">
                <div className="text-center">
                  <span className="font-h2 text-h2 text-primary font-bold">76</span>
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
                  <li className="font-body-sm text-text-secondary">清晰描述了项目背景和目标</li>
                  <li className="font-body-sm text-text-secondary">提到了具体技术选型</li>
                </ul>
              </div>

              <div>
                <h4 className="font-body-md text-risk-medium font-medium mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>
                  改进点
                </h4>
                <ul className="space-y-1">
                  <li className="font-body-sm text-text-secondary">缺少量化成果数据支撑</li>
                  <li className="font-body-sm text-text-secondary">"主导"一词需要更多事实佐证</li>
                </ul>
              </div>

              <div>
                <h4 className="font-body-md text-risk-high font-medium mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  高风险提醒
                </h4>
                <ul className="space-y-1">
                  <li className="font-body-sm text-text-secondary">避免使用模糊词汇，用具体数字替代</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
