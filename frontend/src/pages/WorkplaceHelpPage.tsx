export default function WorkplaceHelpPage() {
  return (
    <div className="max-w-container-max-width mx-auto w-full">
      <header className="mb-6">
        <h2 className="font-h2 text-h2 font-bold text-text-primary">职场沟通</h2>
        <p className="font-body-md text-text-secondary mt-1">
          专业职业沟通顾问，助您应对求职与职场中的关键对话。
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-gutter">
        {/* Left: Config */}
        <div className="w-full lg:w-5/12 space-y-stack-gap">
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
            <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-4">沟通场景</h3>
            <div className="grid grid-cols-2 gap-3">
              {['回复 HR', '薪资谈判', '延期说明', '晋升沟通'].map((scene, i) => (
                <button
                  key={scene}
                  className={`p-3 rounded-lg border font-body-md text-body-md transition-colors ${
                    i === 0
                      ? 'border-agent-accent bg-agent-running/30 text-agent-accent font-medium'
                      : 'border-border-subtle text-on-surface-variant hover:border-outline-variant'
                  }`}
                >
                  {scene}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
            <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-4">表达语气</h3>
            <div className="flex gap-3">
              {['专业', '礼貌', '坚定', '简洁'].map((tone, i) => (
                <button
                  key={tone}
                  className={`px-4 py-2 rounded-lg border font-body-md text-body-md transition-colors ${
                    i === 0
                      ? 'border-agent-accent bg-agent-running/30 text-agent-accent font-medium'
                      : 'border-border-subtle text-on-surface-variant hover:border-outline-variant'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
            <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-4">背景信息与具体诉求</h3>
            <textarea
              className="w-full h-32 border border-border-subtle rounded-lg p-3 font-body-md text-text-primary bg-surface resize-none focus:outline-none focus:border-agent-accent"
              placeholder="例如：HR 发来了面试邀请，但时间与我的日程冲突，需要礼貌地请求调整时间..."
            />
            <button className="mt-3 w-full bg-primary text-on-primary font-body-md py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-colors">
              <span className="material-symbols-outlined text-sm">psychology</span>
              生成沟通建议
            </button>
          </div>
        </div>

        {/* Right: Output */}
        <div className="w-full lg:w-7/12 space-y-stack-gap">
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
            <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-4">沟通策略解析</h3>
            <div className="space-y-3">
              {['先表达感谢和积极态度', '说明具体冲突原因（不暴露过多细节）', '提供 2-3 个替代时间选项', '重申对岗位的兴趣'].map((step, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-surface rounded-lg">
                  <span className="w-6 h-6 rounded-full bg-agent-accent/10 text-agent-accent flex items-center justify-center font-status text-status shrink-0">
                    {i + 1}
                  </span>
                  <p className="font-body-md text-text-primary">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
            <div className="flex items-center gap-4 mb-4 border-b border-border-subtle pb-4">
              {['委婉版本 (推荐)', '直接版本'].map((tab, i) => (
                <button
                  key={tab}
                  className={`px-3 py-2 font-body-md ${i === 0 ? 'text-primary border-b-2 border-primary font-medium' : 'text-on-surface-variant hover:text-primary transition-colors'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="bg-surface p-4 rounded-lg">
              <p className="font-body-lg text-text-primary leading-relaxed">
                您好，非常感谢您的面试邀请，我对这个岗位非常期待！不过很抱歉，当天的时间我已有安排冲突，是否可以调整为本周四下午或周五上午？期待与您进一步交流。
              </p>
            </div>
            <button className="mt-3 px-4 py-2 text-agent-accent hover:text-primary font-status text-status flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">content_copy</span>
              复制文本
            </button>
          </div>

          <div className="bg-surface-container-lowest border border-risk-high/30 rounded-xl p-panel-padding shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-risk-high" />
            <h3 className="font-h3 text-h3 font-semibold text-primary mb-3">避坑指南（高风险表达）</h3>
            <ul className="space-y-2">
              {['"我没空"——过于生硬，缺乏职业素养', '"你们能不能换时间"——语气不礼貌', '"我不确定那天行不行"——含糊不清，拖延沟通'].map((pitfall, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-risk-high text-[16px] mt-0.5">block</span>
                  <p className="font-body-md text-text-primary">{pitfall}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
