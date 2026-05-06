export default function ResumeAnalysisPage() {
  return (
    <div className="max-w-container-max-width mx-auto w-full">
      <header className="mb-6">
        <h2 className="font-h2 text-h2 font-bold text-text-primary">简历分析</h2>
        <p className="font-body-md text-text-secondary mt-1">上传或粘贴您的简历，AI 将为您进行深度结构化解析</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-gutter">
        {/* Left: Input */}
        <div className="w-full lg:w-5/12 flex flex-col gap-stack-gap">
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding flex flex-col h-full shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-h3 text-h3 font-semibold text-text-primary">输入简历</h3>
              <span className="font-status text-status text-text-secondary bg-surface-container px-2 py-1 rounded">
                第 1 步
              </span>
            </div>

            <div className="flex border-b border-border-subtle mb-4">
              <button className="px-4 py-2 font-body-md text-primary border-b-2 border-primary font-medium">
                文件上传
              </button>
              <button className="px-4 py-2 font-body-md text-text-secondary hover:text-primary transition-colors">
                文本粘贴
              </button>
            </div>

            <div className="flex-1 border-2 border-dashed border-border-subtle rounded-lg bg-surface flex flex-col items-center justify-center p-8 text-center hover:bg-surface-container-low transition-colors cursor-pointer group mb-4">
              <span className="material-symbols-outlined text-4xl text-on-primary-container mb-3 group-hover:text-primary transition-colors">
                cloud_upload
              </span>
              <p className="font-body-md text-text-primary font-medium">点击或拖拽文件至此处</p>
              <p className="font-body-sm text-text-secondary mt-1">支持 PDF, DOCX, TXT 格式，最大 10MB</p>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="h-px bg-border-subtle flex-1" />
              <span className="font-body-sm text-text-secondary">最近解析</span>
              <div className="h-px bg-border-subtle flex-1" />
            </div>

            <div className="flex items-center justify-between p-3 border border-border-subtle rounded-lg bg-surface-muted mb-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary">description</span>
                <div>
                  <p className="font-body-md text-text-primary">前端工程师_张三.pdf</p>
                  <p className="font-body-sm text-text-secondary">今天 10:24 &bull; 1.2MB</p>
                </div>
              </div>
              <button className="text-text-secondary hover:text-primary transition-colors">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>

            <button className="w-full bg-primary text-on-primary font-body-md py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-colors mt-auto">
              <span className="material-symbols-outlined text-sm">psychology</span>
              开始深度解析
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div className="w-full lg:w-7/12 flex flex-col gap-stack-gap">
          {/* Status Bar */}
          <div className="bg-agent-running/30 border border-agent-accent/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-agent-accent/20 flex items-center justify-center text-agent-accent">
                <span className="material-symbols-outlined text-lg">check</span>
              </div>
              <div>
                <p className="font-body-md text-text-primary font-medium">解析完成</p>
                <p className="font-body-sm text-text-secondary">AI 已提取并结构化 6 个核心模块</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-surface-container-lowest border border-border-subtle rounded-lg font-body-sm text-text-primary hover:bg-surface-container-low transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">target</span>
                岗位匹配
              </button>
              <button className="px-4 py-2 bg-secondary text-on-secondary rounded-lg font-body-sm flex items-center gap-1 hover:bg-on-secondary-fixed-variant transition-colors">
                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                去润色
              </button>
            </div>
          </div>

          {/* Risk Alerts */}
          <div className="bg-surface-container-lowest border border-risk-medium/30 rounded-xl p-panel-padding shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-risk-medium" />
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-risk-medium mt-0.5">warning</span>
              <div>
                <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-2">AI 洞察：简历风险与缺失</h3>
                <ul className="space-y-3 mt-3">
                  <li className="flex items-start gap-2 bg-surface p-3 rounded border border-border-subtle">
                    <span className="material-symbols-outlined text-risk-high text-[18px] mt-0.5">error</span>
                    <div>
                      <p className="font-body-md text-text-primary font-medium">项目经历缺少个人职责描述</p>
                      <p className="font-body-sm text-text-secondary mt-1">
                        在"电商后台管理系统"项目中，仅描述了系统功能，未说明您的具体贡献。建议补充。
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 bg-surface p-3 rounded border border-border-subtle">
                    <span className="material-symbols-outlined text-risk-medium text-[18px] mt-0.5">help</span>
                    <div>
                      <p className="font-body-md text-text-primary font-medium">技能印证断裂</p>
                      <p className="font-body-sm text-text-secondary mt-1">
                        技能栈中声明了熟练使用
                        LangChain，但下方任何一段工作/项目经历中都没有提到使用该技术的证据。
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Structured Data Grid */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm flex-1">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-h3 text-h3 font-semibold text-text-primary">结构化知识图谱</h3>
              <span className="font-label-caps text-label-caps text-text-secondary uppercase tracking-wider">
                AI 解析结果预览
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: 'person', label: '基本信息', status: 'check_circle', statusColor: 'text-risk-low', desc: '完整度 100%', detail: '已识别：姓名、联系方式、求职意向等 5 项核心字段。' },
                { icon: 'code', label: '技能栈', status: 'info', statusColor: 'text-risk-medium', desc: '需印证', detail: '已识别 12 项技术标签。存在 2 项未在经历中体现的悬空技能。' },
                { icon: 'work', label: '工作经历', status: 'error', statusColor: 'text-risk-high', desc: '量化成果：缺失', detail: '包含 2 段经历。缺少关键的业务数据指标支持。' },
                { icon: 'school', label: '教育经历', status: 'check_circle', statusColor: 'text-risk-low', desc: '完整度 100%', detail: '识别到本科学历，计算机科学与技术专业，毕业时间逻辑合理。' },
              ].map((item) => (
                <div key={item.label} className="border border-border-subtle rounded-lg p-4 bg-surface hover:border-outline-variant transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-text-primary">
                      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                      <span className="font-body-md font-medium">{item.label}</span>
                    </div>
                    <span className={`material-symbols-outlined text-[16px] ${item.statusColor}`}>{item.status}</span>
                  </div>
                  <p className="font-body-sm text-text-secondary">{item.desc}</p>
                  <p className="font-body-sm text-text-primary mt-2">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
