import { useRef, useState, useEffect, type DragEvent, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { uploadResumeFile, parseResume, createResume, getResume, listResumes, deleteResume, type ResumeRead, type ResumeListItem } from '../api/resumes'
import { setCurrentResumeId } from '../utils/currentResume'

export default function ResumeAnalysisPage() {
  const [resumes, setResumes] = useState<ResumeListItem[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ResumeRead | null>(null)
  const [loadingLabel, setLoadingLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false)
  const navigate = useNavigate()

  const loadList = async () => {
    try {
      const data = await listResumes()
      setResumes(data)
    } catch { /* ignore */ }
  }

  useEffect(() => { loadList() }, [])

  const handleFile = async (file: File) => {
    if (busyRef.current) return
    const fileName = file.name
    if (!/\.(docx|doc|txt|md|markdown)$/i.test(fileName)) {
      setError('当前支持 .docx、.doc、.txt、.md 格式')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('文件过大，请选择 5MB 以内')
      return
    }

    setError(null)
    busyRef.current = true
    setLoading(true)
    setLoadingLabel('正在上传...')
    try {
      const baseTitle = file.name.replace(/\.(docx|doc|txt|md|markdown)$/i, '')
      let resume = await uploadResumeFile(file, baseTitle)

      // If upload returned an existing parsed resume, create a new copy with suffix
      if (resume.parse_status === 'succeeded' || resume.parse_status === 'quick_succeeded') {
        // Find next available suffix
        const existingTitles = resumes.map(r => r.title)
        let suffix = 2
        while (existingTitles.includes(`${baseTitle}-${suffix}`)) suffix++
        const newTitle = `${baseTitle}-${suffix}`

        resume = await createResume({
          title: newTitle,
          raw_text: resume.raw_text,
          source_type: resume.source_type,
        })
      }

      setCurrentResumeId(resume.id)
      setLoadingLabel('AI 正在解析...')
      const parsed = await parseResume(resume.id)
      setDetail(parsed)
      setExpandedId(parsed.id)
      await loadList()
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : '上传或解析失败，请重试')
    } finally {
      busyRef.current = false
      setLoading(false)
      setLoadingLabel('')
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) handleFile(file)
    event.target.value = ''
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleExpand = async (resumeId: string) => {
    if (expandedId === resumeId) {
      setExpandedId(null)
      setDetail(null)
      return
    }
    setExpandedId(resumeId)
    setDetail(null)
    try {
      const data = await getResume(resumeId)
      setDetail(data)
      if (data.parse_status === 'pending') {
        const parsed = await parseResume(resumeId)
        setDetail(parsed)
        await loadList()
      }
    } catch { /* ignore */ }
  }

  const handleDelete = async (resumeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('确认删除这份简历？')) return
    try {
      await deleteResume(resumeId)
      if (expandedId === resumeId) { setExpandedId(null); setDetail(null) }
      await loadList()
    } catch { /* ignore */ }
  }

  const structured = detail?.structured_json ?? null
  const basicInfo = (structured?.basic_info ?? {}) as Record<string, unknown>
  const skills = Array.isArray(structured?.skills) ? structured.skills : []
  const education = Array.isArray(structured?.education) ? structured.education : []
  const projects = Array.isArray(structured?.projects) ? structured.projects : []
  const experiences = Array.isArray(structured?.work_experiences) ? structured.work_experiences : []
  const parseSucceeded = detail?.parse_status === 'succeeded' || detail?.parse_status === 'quick_succeeded'

  const statusMap: Record<string, { label: string; color: string }> = {
    succeeded: { label: 'AI 已解析', color: 'bg-risk-low/20 text-risk-low' },
    quick_succeeded: { label: '初步解析', color: 'bg-risk-medium/20 text-risk-medium' },
    pending: { label: '待解析', color: 'bg-on-surface-variant/20 text-on-surface-variant' },
    failed: { label: '解析失败', color: 'bg-risk-high/20 text-risk-high' },
    processing: { label: '解析中', color: 'bg-agent-accent/20 text-agent-accent' },
  }

  return (
    <div className="max-w-container-max-width mx-auto w-full">
      <header className="mb-6">
        <h2 className="font-h2 text-h2 font-bold text-text-primary">我的简历</h2>
        <p className="font-body-md text-text-secondary mt-1">上传简历，AI 自动解析，随时查看和操作</p>
      </header>

      {/* Upload Area */}
      <input ref={fileInputRef} type="file" accept=".docx,.doc,.txt,.md" className="hidden" onChange={handleFileChange} disabled={loading} />

      {loading ? (
        <div className="mb-6 bg-surface-container-lowest border border-border-subtle rounded-xl p-5 shadow-sm flex items-center gap-4">
          <span className="material-symbols-outlined text-2xl text-agent-accent animate-spin">progress_activity</span>
          <div>
            <p className="font-body-md text-text-primary font-medium">{loadingLabel}</p>
            <p className="font-body-sm text-on-surface-variant">请稍候...</p>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          className={`mb-6 bg-surface-container-lowest border-2 border-dashed rounded-xl p-5 shadow-sm cursor-pointer transition-colors flex items-center gap-4 ${
            dragOver ? 'border-agent-accent bg-agent-accent/5' : 'border-border-subtle hover:border-agent-accent/50'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-agent-accent/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl text-agent-accent">upload_file</span>
          </div>
          <div>
            <p className="font-body-md text-text-primary font-medium">拖拽简历文件到此处，或点击上传</p>
            <p className="font-body-sm text-on-surface-variant">支持 .docx .doc .txt .md，5MB 以内</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-risk-high/10 border border-risk-high/30 rounded-lg">
          <p className="font-body-md text-risk-high">{error}</p>
        </div>
      )}

      {/* Resume List */}
      {resumes.length === 0 && !loading ? (
        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-10 shadow-sm text-center">
          <span className="material-symbols-outlined text-5xl text-on-primary-container mb-3">description</span>
          <p className="font-body-md text-text-secondary mb-1">还没有简历</p>
          <p className="font-body-sm text-on-surface-variant">上传一份简历，AI 将自动为您解析</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resumes.map((r) => {
            const isExpanded = expandedId === r.id
            const st = statusMap[r.parse_status] || { label: r.parse_status, color: 'bg-on-surface-variant/20 text-on-surface-variant' }
            return (
              <div key={r.id} className="bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm overflow-hidden">
                {/* Card Header */}
                <button
                  onClick={() => handleExpand(r.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-surface-container-low transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-lg text-primary">description</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-body-md text-text-primary font-medium truncate">{r.title}</p>
                      <span className={`px-2 py-0.5 rounded font-body-sm text-xs shrink-0 ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="font-body-sm text-on-surface-variant">{new Date(r.created_at).toLocaleString('zh-CN')}</p>
                  </div>
                  <span className={`material-symbols-outlined text-on-surface-variant transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                </button>

                {/* Expanded Detail */}
                {isExpanded && detail && detail.id === r.id && (
                  <div className="border-t border-border-subtle px-5 py-5 space-y-5">
                    {detail.parse_status === 'pending' && (
                      <p className="font-body-sm text-on-surface-variant">正在解析，请稍候...</p>
                    )}
                    {detail.parse_status === 'failed' && (
                      <p className="font-body-sm text-risk-high">解析失败，请重新上传</p>
                    )}
                    {parseSucceeded && structured && (
                      <>
                        {/* Basic Info */}
                        <div>
                          <h4 className="font-body-md font-medium text-text-primary mb-3">基本信息</h4>
                          <div className="flex flex-wrap gap-x-6 gap-y-2">
                            {[
                              { icon: 'person', label: '姓名', value: basicInfo.name },
                              { icon: 'phone_android', label: '电话', value: basicInfo.phone },
                              { icon: 'mail', label: '邮箱', value: basicInfo.email },
                              { icon: 'cake', label: '年龄', value: basicInfo.age ? `${basicInfo.age} 岁` : null },
                              { icon: 'flag', label: '政治面貌', value: basicInfo.political_status },
                            ].filter(item => item.value).map(item => (
                              <div key={item.label} className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-on-primary-container">{item.icon}</span>
                                <span className="font-body-sm text-on-surface-variant">{item.label}</span>
                                <span className="font-body-sm text-text-primary font-medium">{String(item.value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Education */}
                        {education.length > 0 && (
                          <div>
                            <h4 className="font-body-md font-medium text-text-primary mb-3">教育经历</h4>
                            <div className="space-y-2">
                              {(education as Record<string, unknown>[]).map((edu, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <span className="material-symbols-outlined text-[16px] text-primary">school</span>
                                  <span className="text-text-primary font-medium">{String(edu.school || '')}</span>
                                  <span className="text-text-secondary">{[edu.major, edu.degree].filter(Boolean).map(s => String(s)).join(' · ')}</span>
                                  <span className="text-on-surface-variant">{[String(edu.start_date ?? ''), String(edu.end_date ?? '')].filter(Boolean).join(' - ')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Work Experience */}
                        {experiences.length > 0 && (
                          <div>
                            <h4 className="font-body-md font-medium text-text-primary mb-3">工作/实习经历</h4>
                            <div className="space-y-2">
                              {(experiences as Record<string, unknown>[]).map((exp, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                  <span className="material-symbols-outlined text-[16px] text-secondary mt-0.5">business_center</span>
                                  <div>
                                    <span className="text-text-primary font-medium">{String(exp.company || '')}</span>
                                    {Boolean(exp.role) && <span className="text-text-secondary ml-1">{String(exp.role)}</span>}
                                    <span className="text-on-surface-variant ml-2">{[String(exp.start_date ?? ''), String(exp.end_date ?? '')].filter(Boolean).join(' - ')}</span>
                                    {Boolean(exp.description) && <p className="text-text-secondary mt-0.5 line-clamp-2">{String(exp.description)}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Projects */}
                        {projects.length > 0 && (
                          <div>
                            <h4 className="font-body-md font-medium text-text-primary mb-3">项目经历</h4>
                            <div className="space-y-2">
                              {(projects as Record<string, unknown>[]).map((proj, i) => {
                                const ts = Array.isArray(proj.tech_stack) ? proj.tech_stack : []
                                return (
                                  <div key={i} className="p-3 rounded-lg bg-surface">
                                    <div className="flex items-baseline gap-2 mb-1">
                                      <span className="text-sm text-text-primary font-medium">{String(proj.name || `项目 ${i + 1}`)}</span>
                                      {Boolean(proj.role) && <span className="text-xs text-on-surface-variant">{String(proj.role)}</span>}
                                    </div>
                                    {Boolean(proj.description) && <p className="text-xs text-text-secondary mb-1.5 line-clamp-2">{String(proj.description)}</p>}
                                    {ts.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {ts.map((t: unknown, j: number) => (
                                          <span key={j} className="px-1.5 py-0.5 bg-agent-accent/10 text-agent-accent rounded text-xs">{String(t)}</span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Skills */}
                        {skills.length > 0 && (
                          <div>
                            <h4 className="font-body-md font-medium text-text-primary mb-3">技能标签</h4>
                            <div className="flex flex-wrap gap-2">
                              {skills.map((skill, i) => (
                                <span key={i} className="px-2.5 py-1 bg-agent-running/30 text-agent-accent rounded-lg font-body-sm">{String((skill as Record<string, unknown>).name || skill)}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-3 pt-2 border-t border-border-subtle">
                          <button
                            onClick={() => { setCurrentResumeId(r.id); navigate('/resume-polish') }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-body-md hover:bg-on-primary-fixed-variant transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">edit_note</span>
                            简历润色
                          </button>
                          <button
                            onClick={() => { setCurrentResumeId(r.id); navigate('/mock-interview') }}
                            className="flex items-center gap-2 px-4 py-2 border border-border-subtle text-text-primary rounded-lg font-body-md hover:bg-surface-container-low transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">record_voice_over</span>
                            模拟面试
                          </button>
                          <button
                            onClick={(e) => handleDelete(r.id, e)}
                            className="flex items-center gap-2 px-4 py-2 text-risk-high rounded-lg font-body-md hover:bg-risk-high/10 transition-colors ml-auto"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                            删除
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
