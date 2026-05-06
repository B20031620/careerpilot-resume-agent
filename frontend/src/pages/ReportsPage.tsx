export default function ReportsPage() {
  const reports = [
    { id: '1', name: '个人简历_v3_匹配分析', type: '岗位匹配', score: 82, date: '2024-01-15', status: '完成' },
    { id: '2', name: '腾讯产品总监_JD分析', type: '简历分析', score: 75, date: '2024-01-14', status: '完成' },
    { id: '3', name: '字节跳动-一面模拟', type: '面试报告', score: 76, date: '2024-01-12', status: '完成' },
    { id: '4', name: '薪资谈判沟通建议', type: '沟通建议', score: null, date: '2024-01-10', status: '完成' },
  ]

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
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-h3 text-h3 text-primary">报告列表</h3>
                <button className="text-on-surface-variant hover:text-primary font-status text-status">批量删除</button>
              </div>
              <input
                className="w-full px-3 py-2 border border-border-subtle rounded-lg font-body-md text-text-primary bg-surface focus:outline-none focus:border-agent-accent"
                placeholder="搜索报告名称、岗位..."
              />
            </div>
            <div className="flex border-b border-border-subtle px-5">
              {['全部', '简历分析', '岗位匹配', '面试报告', '沟通建议'].map((tab, i) => (
                <button
                  key={tab}
                  className={`px-4 py-3 font-body-md ${i === 0 ? 'text-primary border-b-2 border-primary font-medium' : 'text-on-surface-variant hover:text-primary transition-colors'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle text-on-surface-variant font-label-caps text-label-caps bg-surface-muted/50">
                  <th className="px-5 py-3 font-medium">报告信息</th>
                  <th className="px-5 py-3 font-medium">AI 评分/状态</th>
                  <th className="px-5 py-3 font-medium">生成日期</th>
                  <th className="px-5 py-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm text-on-surface">
                {reports.map((r) => (
                  <tr key={r.id} className="border-b border-border-subtle hover:bg-surface-muted transition-colors cursor-pointer">
                    <td className="px-5 py-4">
                      <p className="font-medium text-primary">{r.name}</p>
                      <p className="text-on-surface-variant mt-0.5">{r.type}</p>
                    </td>
                    <td className="px-5 py-4">
                      {r.score ? (
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${r.score >= 80 ? 'bg-risk-low' : r.score >= 60 ? 'bg-risk-medium' : 'bg-risk-high'}`} />
                          <span>{r.score}分</span>
                        </div>
                      ) : (
                        <span className="text-on-surface-variant">{r.status}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">{r.date}</td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-agent-accent hover:text-primary transition-colors font-status">查看</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Report Summary */}
        <div className="w-full lg:w-5/12">
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
            <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-4">报告摘要</h3>
            <p className="font-body-sm text-on-surface-variant mb-6">选择左侧报告查看详情</p>

            <div className="space-y-6">
              <div>
                <h4 className="font-h3 text-h3 text-primary mb-3">整体评价</h4>
                <p className="font-body-md text-text-secondary">
                  综合分析显示，候选人在技术能力和项目经验方面表现良好，但在量化成果展示和系统设计经验方面存在提升空间。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-body-md text-risk-low font-medium mb-2">关键优势</h4>
                  <ul className="space-y-1">
                    {['技术栈匹配度高', 'AI 项目经验丰富'].map((s) => (
                      <li key={s} className="font-body-sm text-text-secondary flex items-center gap-1">
                        <span className="material-symbols-outlined text-risk-low text-[14px]">check</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-body-md text-risk-high font-medium mb-2">主要短板</h4>
                  <ul className="space-y-1">
                    {['量化成果缺失', '系统设计经验不足'].map((s) => (
                      <li key={s} className="font-body-sm text-text-secondary flex items-center gap-1">
                        <span className="material-symbols-outlined text-risk-high text-[14px]">close</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t border-border-subtle space-y-3">
                <h4 className="font-body-md text-primary font-medium">下一步建议</h4>
                <button className="w-full p-3 rounded-lg border border-border-subtle bg-surface flex items-center gap-3 hover:bg-surface-container-low transition-colors text-left">
                  <span className="material-symbols-outlined text-agent-accent">edit_note</span>
                  <span className="font-body-md text-text-primary">使用 AI 润色简历</span>
                </button>
                <button className="w-full p-3 rounded-lg border border-border-subtle bg-surface flex items-center gap-3 hover:bg-surface-container-low transition-colors text-left">
                  <span className="material-symbols-outlined text-agent-accent">record_voice_over</span>
                  <span className="font-body-md text-text-primary">发起模拟面试</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
