import { useRef, useState, type ChangeEvent } from 'react'
import { ApiError } from '../api/client'
import { createResume, type ResumeRead } from '../api/resumes'

export default function ResumeAnalysisPage() {
  const [title, setTitle] = useState('')
  const [rawText, setRawText] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResumeRead | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePickFile = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    const fileName = file.name
    const supportedTextFile = /\.(txt|md|markdown|csv|json|log)$/i.test(fileName) || file.type.startsWith('text/')
    if (!supportedTextFile) {
      setError('当前演示版支持读取 .txt、.md、.csv、.json 等文本文件；PDF 或 Word 请先复制正文粘贴。')
      event.target.value = ''
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('文件过大，请选择 2MB 以内的文本简历，或复制核心内容粘贴。')
      event.target.value = ''
      return
    }

    try {
      const text = await file.text()
      setRawText(text)
      setSelectedFileName(fileName)
      if (!title.trim()) {
        setTitle(fileName.replace(/\.[^.]+$/, ''))
      }
    } catch {
      setError('读取文件失败，请重新选择文件或直接粘贴文本。')
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) return
    setLoading(true)
    setError(null)
    try {
      const resume = await createResume({
        title: title.trim(),
        raw_text: rawText,
        source_type: selectedFileName ? 'file' : 'text',
      })
      setResult(resume)
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.detail)
      } else {
        setError('创建简历失败，请检查后端服务是否启动')
      }
    } finally {
      setLoading(false)
    }
  }

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
              accept=".txt,.md,.markdown,.csv,.json,.log,text/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex border-b border-border-subtle mb-4">
              <button
                type="button"
                onClick={handlePickFile}
                className="px-4 py-2 font-body-md text-text-secondary hover:text-primary transition-colors flex items-center gap-1"
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
                  className="font-body-sm text-on-surface-variant hover:text-primary"
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
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <textarea
              className="w-full flex-1 min-h-[200px] border border-border-subtle rounded-lg p-3 font-body-md text-text-primary bg-surface resize-none focus:outline-none focus:border-agent-accent mb-4"
              placeholder="请粘贴简历原文，或点击「文件上传」读取文本文件..."
              value={rawText}
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
              disabled={loading || !title.trim()}
              className="w-full bg-primary text-on-primary font-body-md py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-colors mt-auto disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">{loading ? 'hourglass_top' : 'psychology'}</span>
              {loading ? '正在创建...' : '开始深度解析'}
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div className="w-full lg:w-7/12 flex flex-col gap-stack-gap">
          {result ? (
            <>
              {/* Status Bar */}
              <div className="bg-agent-running/30 border border-agent-accent/20 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-agent-accent/20 flex items-center justify-center text-agent-accent">
                    <span className="material-symbols-outlined text-lg">check</span>
                  </div>
                  <div>
                    <p className="font-body-md text-text-primary font-medium">简历已创建</p>
                    <p className="font-body-sm text-text-secondary">ID: {result.id}</p>
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
