import { useRef, useState, type ChangeEvent } from 'react'
import { ApiError } from '../api/client'
import { createResume, parseResume, uploadResumeFile, type ResumeRead } from '../api/resumes'

export default function ResumeAnalysisPage() {
  const [title, setTitle] = useState('')
  const [rawText, setRawText] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [loadingLabel, setLoadingLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResumeRead | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false)

  const handlePickFile = () => {
    if (busyRef.current) return
    fileInputRef.current?.click()
  }

  const runParse = async (resume: ResumeRead) => {
    setResult(resume)
    setLoadingLabel('正在进行 AI 结构化解析...')
    const parsed = await parseResume(resume.id)
    setResult(parsed)
    return parsed
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (busyRef.current) return
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    const fileName = file.name
    const supportedFile = /\.(docx|doc|txt|md|markdown|csv|json|log)$/i.test(fileName) || file.type.startsWith('text/')
    if (!supportedFile) {
      setError('当前支持 .docx、.doc、.txt、.md、.csv、.json 等格式。PDF 请先复制正文粘贴。')
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('文件过大，请选择 5MB 以内的简历文件，或复制核心内容粘贴。')
      event.target.value = ''
      return
    }

    busyRef.current = true
    setLoading(true)
    setLoadingLabel('正在上传并提取简历文本...')
    setSelectedFileName(fileName)
    try {
      const resume = await uploadResumeFile(file, title.trim() || undefined)
      setTitle(resume.title)
      setRawText(resume.raw_text)
      await runParse(resume)
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.detail)
      } else {
        setError('上传或解析失败，请检查文件格式、模型配置或后端服务。')
      }
      setSelectedFileName('')
      event.target.value = ''
    } finally {
      busyRef.current = false
      setLoading(false)
      setLoadingLabel('')
      event.target.value = ''
    }
  }

  const handleSubmit = async () => {
    if (!title.trim() || busyRef.current) return
    busyRef.current = true
    setLoading(true)
    setLoadingLabel('正在创建简历记录...')
    setError(null)
    try {
      const resume = await createResume({
        title: title.trim(),
        raw_text: rawText,
        source_type: selectedFileName ? 'file' : 'text',
      })
      await runParse(resume)
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.detail)
      } else {
        setError('创建或解析简历失败，请检查后端服务是否启动')
      }
    } finally {
      busyRef.current = false
      setLoading(false)
      setLoadingLabel('')
    }
  }

  const structured = result?.structured_json ?? null
  const basicInfo = (structured?.basic_info ?? {}) as Record<string, unknown>
  const skills = Array.isArray(structured?.skills) ? structured.skills : []
  const projects = Array.isArray(structured?.projects) ? structured.projects : []
  const experiences = Array.isArray(structured?.work_experiences) ? structured.work_experiences : []
  const parseError = result?.parse_warnings?.error ? String(result.parse_warnings.error) : ''

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

            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.doc,.txt,.md,.markdown,.csv,.json,.log,text/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleFileChange}
              disabled={loading}
            />

            <div className="flex border-b border-border-subtle mb-4">
              <button
                type="button"
                onClick={handlePickFile}
                disabled={loading}
                className="px-4 py-2 font-body-md text-text-secondary hover:text-primary transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                文件上传
              </button>
              <button className="px-4 py-2 font-body-md text-primary border-b-2 border-primary font-medium">
                文本粘贴
              </button>
            </div>
            {selectedFileName && (
              <div className="mb-4 flex items-center justify-between rounded-lg border border-agent-accent/20 bg-agent-running/20 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[18px] text-agent-accent">description</span>
                  <p className="font-body-sm text-text-primary truncate">{selectedFileName}</p>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  className="font-body-sm text-on-surface-variant hover:text-primary disabled:opacity-50"
                  onClick={() => {
                    setSelectedFileName('')
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                >
                  清除文件
                </button>
              </div>
            )}

            <div className="mb-3">
              <label className="block font-body-md text-text-primary font-medium mb-1">简历标题</label>
              <input
                className="w-full px-3 py-2 border border-border-subtle rounded-lg font-body-md text-text-primary bg-surface focus:outline-none focus:border-agent-accent"
                placeholder="例如：前端工程师_张三"
                value={title}
                disabled={loading}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <textarea
              className="w-full flex-1 min-h-[200px] border border-border-subtle rounded-lg p-3 font-body-md text-text-primary bg-surface resize-none focus:outline-none focus:border-agent-accent mb-4"
              placeholder="请粘贴简历原文，或点击「文件上传」上传 DOCX/DOC/文本文件..."
              value={rawText}
              disabled={loading}
              onChange={(e) => {
                setRawText(e.target.value)
                if (!e.target.value.trim()) setSelectedFileName('')
              }}
            />

            {error && (
              <div className="mb-4 p-3 bg-risk-high/10 border border-risk-high/30 rounded-lg">
                <p className="font-body-md text-risk-high">{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !title.trim() || !rawText.trim()}
              className="w-full bg-primary text-on-primary font-body-md py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-colors mt-auto disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">{loading ? 'hourglass_top' : 'psychology'}</span>
              {loading ? (loadingLabel || '正在处理...') : '开始深度解析'}
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div className="w-full lg:w-7/12 flex flex-col gap-stack-gap">
          {result ? (
            <>
              {/* Status Bar */}
              <div className={`${result.parse_status === 'failed' ? 'bg-risk-high/10 border-risk-high/30' : result.parse_status === 'succeeded' ? 'bg-agent-running/30 border-agent-accent/20' : 'bg-risk-medium/10 border-risk-medium/30'} border rounded-xl p-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-agent-accent/20 flex items-center justify-center text-agent-accent">
                    <span className="material-symbols-outlined text-lg">
                      {result.parse_status === 'failed' ? 'error' : result.parse_status === 'succeeded' ? 'check' : 'hourglass_top'}
                    </span>
                  </div>
                  <div>
                    <p className="font-body-md text-text-primary font-medium">
                      {result.parse_status === 'succeeded' ? '简历解析完成' : result.parse_status === 'failed' ? '简历解析失败' : '简历已创建，等待解析'}
                    </p>
                    <p className="font-body-sm text-text-secondary">ID: {result.id}</p>
                    {parseError && <p className="font-body-sm text-risk-high mt-1">{parseError}</p>}
                  </div>
                </div>
              </div>

              {/* Structured Data Grid */}
              <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm flex-1">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-h3 text-h3 font-semibold text-text-primary">简历信息</h3>
                  <span className="font-label-caps text-label-caps text-text-secondary uppercase tracking-wider">
                    解析状态: {result.parse_status}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { icon: 'title', label: '标题', value: result.title },
                    { icon: 'category', label: '来源类型', value: result.source_type },
                    { icon: 'text_snippet', label: '原文长度', value: `${result.raw_text.length} 字` },
                    { icon: 'schedule', label: '创建时间', value: new Date(result.created_at).toLocaleString('zh-CN') },
                    { icon: 'person', label: '姓名', value: String(basicInfo.name || '未识别') },
                    { icon: 'work', label: '项目数量', value: `${projects.length} 个` },
                    { icon: 'psychology', label: '技能数量', value: `${skills.length} 项` },
                    { icon: 'business_center', label: '经历数量', value: `${experiences.length} 段` },
                  ].map((item) => (
                    <div key={item.label} className="border border-border-subtle rounded-lg p-4 bg-surface hover:border-outline-variant transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-[18px] text-on-primary-container">{item.icon}</span>
                        <span className="font-body-md font-medium text-text-primary">{item.label}</span>
                      </div>
                      <p className="font-body-sm text-text-secondary">{item.value}</p>
                    </div>
                  ))}
                </div>
                {result.parse_status === 'succeeded' && structured && (
                  <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="border border-border-subtle rounded-lg p-4 bg-surface">
                      <h4 className="font-body-md font-medium text-text-primary mb-3">识别技能</h4>
                      <div className="flex flex-wrap gap-2">
                        {skills.slice(0, 12).map((skill, index) => (
                          <span key={index} className="px-2 py-1 bg-agent-running/30 text-agent-accent rounded font-body-sm">
                            {String((skill as Record<string, unknown>).name || skill)}
                          </span>
                        ))}
                        {skills.length === 0 && <span className="font-body-sm text-on-surface-variant">暂无结构化技能</span>}
                      </div>
                    </div>
                    <div className="border border-border-subtle rounded-lg p-4 bg-surface">
                      <h4 className="font-body-md font-medium text-text-primary mb-3">识别项目</h4>
                      <div className="space-y-2">
                        {projects.slice(0, 4).map((project, index) => (
                          <p key={index} className="font-body-sm text-text-secondary">
                            {String((project as Record<string, unknown>).name || `项目 ${index + 1}`)}
                          </p>
                        ))}
                        {projects.length === 0 && <span className="font-body-sm text-on-surface-variant">暂无结构化项目</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm flex-1 flex items-center justify-center">
              <div className="text-center">
                <span className="material-symbols-outlined text-5xl text-on-primary-container mb-3">description</span>
                <p className="font-body-md text-text-secondary">输入简历标题和原文后点击「开始深度解析」</p>
                <p className="font-body-sm text-on-surface-variant mt-2">解析结果将在此处展示</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
