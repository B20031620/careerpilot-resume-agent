export default function DashboardPage() {
  return (
    <div className="max-w-container-max-width mx-auto space-y-stack-gap">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="font-h1 text-h1 text-primary mb-1">工作台</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            欢迎回来，这是您的求职准备状态概览
          </p>
        </div>
        <button className="bg-primary text-on-primary font-status text-status px-5 py-2.5 rounded hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">add_circle</span>
          新建分析
        </button>
      </div>

      {/* Bento Grid: Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="col-span-1 bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="font-body-sm text-body-sm text-on-surface-variant">综合简历评分</span>
            <span className="material-symbols-outlined text-on-surface-variant text-lg">speed</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="font-h1 text-[40px] leading-none text-primary font-bold">82</span>
            <span className="font-body-sm text-body-sm text-risk-low mb-1 font-medium">/100 良好</span>
          </div>
          <div className="mt-4 h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-risk-low rounded-full" style={{ width: '82%' }} />
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-agent-accent text-sm">work</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">已分析岗位</span>
          </div>
          <span className="font-h2 text-h2 text-primary">
            12 <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">个</span>
          </span>
        </div>

        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-agent-accent text-sm">record_voice_over</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">模拟面试</span>
          </div>
          <span className="font-h2 text-h2 text-primary">
            5 <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">次</span>
          </span>
        </div>

        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-risk-medium text-sm">local_fire_department</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">最近高匹配度岗位</span>
          </div>
          <span className="font-status text-status text-primary line-clamp-1">高级产品经理 @ 字节跳动</span>
          <div className="mt-2 flex items-center gap-1">
            <span className="inline-block px-1.5 py-0.5 bg-risk-low/10 text-risk-low rounded text-[10px] font-bold tracking-wider uppercase">
              匹配度 88%
            </span>
          </div>
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
                <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                  您的基础简历已解析完成，综合结构良好。建议添加目标岗位 JD
                  以进行深度的「人岗匹配度分析」。
                </p>
                <button className="bg-surface-container-highest text-primary font-status text-status px-4 py-2 rounded border border-border-subtle hover:bg-surface-dim transition-colors">
                  添加目标岗位
                </button>
              </div>
            </div>
          </div>

          {/* Recent Analysis Records */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border-subtle bg-surface-muted flex justify-between items-center">
              <h3 className="font-h3 text-h3 text-primary">最近分析记录</h3>
              <a className="font-body-sm text-body-sm text-agent-accent hover:underline" href="#">
                查看全部
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle text-on-surface-variant font-label-caps text-label-caps bg-surface-muted/50">
                    <th className="px-5 py-3 font-medium">任务名称</th>
                    <th className="px-5 py-3 font-medium">类型</th>
                    <th className="px-5 py-3 font-medium">状态 / 评分</th>
                    <th className="px-5 py-3 font-medium">时间</th>
                    <th className="px-5 py-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm text-on-surface">
                  <tr className="border-b border-border-subtle hover:bg-surface-muted transition-colors">
                    <td className="px-5 py-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-on-surface-variant text-base">description</span>
                      <span className="font-medium text-primary">个人简历_v3_优化版.pdf</span>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">简历润色</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-risk-low" />
                        <span>完成 (88分)</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">2小时前</td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-agent-accent hover:text-primary transition-colors font-status">
                        查看报告
                      </button>
                    </td>
                  </tr>
                  <tr className="border-b border-border-subtle hover:bg-surface-muted transition-colors">
                    <td className="px-5 py-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-on-surface-variant text-base">business_center</span>
                      <span className="font-medium text-primary">腾讯产品总监 JD 分析</span>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">岗位匹配</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-risk-medium" />
                        <span>完成 (75分)</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">昨天 14:30</td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-agent-accent hover:text-primary transition-colors font-status">
                        查看报告
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-muted transition-colors">
                    <td className="px-5 py-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-on-surface-variant text-base">record_voice_over</span>
                      <span className="font-medium text-primary">字节跳动-一面模拟</span>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">模拟面试</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-border-subtle" />
                        <span className="text-on-surface-variant">草稿</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">3天前</td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-agent-accent hover:text-primary transition-colors font-status">
                        继续
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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
                <p className="font-status text-status text-primary mb-0.5">正在提取「个人简历_v3」核心能力项</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  系统正在进行自然语言处理与结构化...
                </p>
                <span className="text-[10px] text-on-surface-variant mt-1 block">刚刚</span>
              </div>
              <div className="relative pl-6">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-surface-container-lowest border-2 border-risk-high z-10" />
                <p className="font-status text-status text-primary mb-0.5">发现 2 条高风险建议</p>
                <div className="bg-error-container/20 border border-error-container rounded p-2 mt-2">
                  <p className="font-body-sm text-body-sm text-risk-high line-clamp-2">
                    "工作经历"模块中缺乏具体的数据指标支撑，建议补充项目的量化成果。
                  </p>
                </div>
                <span className="text-[10px] text-on-surface-variant mt-1 block">10:31</span>
              </div>
              <div className="relative pl-6">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-surface-container-lowest border-2 border-border-subtle z-10" />
                <p className="font-status text-status text-primary mb-0.5">简历结构解析完成</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">成功识别 5 个主要模块。</p>
                <span className="text-[10px] text-on-surface-variant mt-1 block">10:30</span>
              </div>
              <div className="relative pl-6">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-surface-container-lowest border-2 border-border-subtle z-10" />
                <p className="font-status text-status text-primary mb-0.5">初始化求职意向上下文</p>
                <span className="text-[10px] text-on-surface-variant mt-1 block">10:28</span>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-border-subtle bg-surface-muted/50 text-center">
            <button className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center w-full gap-1">
              <span className="material-symbols-outlined text-[14px]">history</span>
              查看完整日志
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
