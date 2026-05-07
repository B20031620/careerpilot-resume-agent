import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { deleteResume, listResumes, type ResumeListItem } from '../api/resumes'
import { getCurrentResumeId, setCurrentResumeId } from '../utils/currentResume'

export default function ResumeWorkspacePage() {
  const [resumes, setResumes] = useState<ResumeListItem[]>([])
  const [currentId, setCurrentId] = useState(getCurrentResumeId())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const currentResume = useMemo(
    () => resumes.find((resume) => resume.id === currentId) || null,
    [currentId, resumes],
  )

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listResumes()
      setResumes(data)
      const stored = getCurrentResumeId()
      if (stored && data.some((resume) => resume.id === stored)) {
        setCurrentId(stored)
      } else if (data[0]) {
        setCurrentResumeId(data[0].id)
        setCurrentId(data[0].id)
      } else {
        setCurrentResumeId('')
        setCurrentId('')
      }
    } catch {
      setError('简历列表加载失败，请检查登录状态或后端服务')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSelect = (resumeId: string) => {
    setCurrentResumeId(resumeId)
    setCurrentId(resumeId)
  }

  const handleDelete = async (resumeId: string) => {
    if (!window.confirm('确认删除这份简历？相关历史报告不会被删除，但这份简历将不再出现在选择列表中。')) return
    await deleteResume(resumeId)
    await load()
  }

  const statusLabel: Record<string, string> = {
    pending: '待分析',
    imported: '已导入',
    processing: '分析中',
    quick_succeeded: '初步分析',
    succeeded: '已分析',
    failed: '分析失败',
  }

  return (
    <div className="max-w-container-max-width mx-auto w-full space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="font-h1 text-h1 text-primary mb-1">简历工作区</h2>
          <p className="font-body-md text-text-secondary">
            先选定当前处理的简历，后续岗位匹配、简历润色和模拟面试都会围绕它展开。
          </p>
        </div>
        <Link
          to="/resume-analysis"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg font-body-md hover:bg-on-primary-fixed-variant transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          上传新简历
        </Link>
      </header>

      {currentResume && (
        <section className="bg-surface-container-lowest border border-agent-accent/30 rounded-xl p-panel-padding shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="font-label-caps text-label-caps text-agent-accent mb-1">当前简历</p>
              <h3 className="font-h2 text-h2 text-primary font-bold">{currentResume.title}</h3>
              <p className="font-body-sm text-text-secondary mt-1">
                {statusLabel[currentResume.parse_status] || currentResume.parse_status} · {new Date(currentResume.created_at).toLocaleString('zh-CN')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => navigate('/job-match')} className="px-4 py-2 rounded-lg bg-primary text-on-primary font-body-md">
                岗位匹配
              </button>
              <button onClick={() => navigate('/resume-polish')} className="px-4 py-2 rounded-lg border border-border-subtle text-text-primary font-body-md">
                简历润色
              </button>
              <button onClick={() => navigate('/mock-interview')} className="px-4 py-2 rounded-lg border border-border-subtle text-text-primary font-body-md">
                模拟面试
              </button>
            </div>
          </div>
        </section>
      )}

      {error && (
        <div className="p-3 bg-risk-high/10 border border-risk-high/30 rounded-lg">
          <p className="font-body-md text-risk-high">{error}</p>
        </div>
      )}

      <section className="bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle bg-surface-muted flex items-center justify-between">
          <h3 className="font-h3 text-h3 text-primary">我的简历</h3>
          <span className="font-body-sm text-on-surface-variant">{loading ? '加载中...' : `${resumes.length} 份`}</span>
        </div>

        {!loading && resumes.length === 0 ? (
          <div className="p-10 text-center">
            <span className="material-symbols-outlined text-5xl text-on-primary-container mb-3">description</span>
            <p className="font-body-md text-text-secondary mb-4">还没有简历，请先上传一份作为当前工作对象。</p>
            <button
              onClick={() => navigate('/resume-analysis')}
              className="px-5 py-2.5 bg-primary text-on-primary rounded-lg font-body-md"
            >
              上传简历
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {resumes.map((resume) => {
              const active = resume.id === currentId
              return (
                <div key={resume.id} className={`p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 ${active ? 'bg-agent-running/20' : 'bg-surface'}`}>
                  <button type="button" onClick={() => handleSelect(resume.id)} className="text-left flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-body-md text-text-primary font-medium">{resume.title}</h4>
                      {active && <span className="px-2 py-0.5 rounded bg-agent-accent/10 text-agent-accent font-body-sm">当前</span>}
                    </div>
                    <p className="font-body-sm text-text-secondary">
                      {statusLabel[resume.parse_status] || resume.parse_status} · {new Date(resume.created_at).toLocaleString('zh-CN')}
                    </p>
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => handleSelect(resume.id)} className="px-3 py-1.5 rounded border border-border-subtle text-text-primary font-body-sm">
                      设为当前
                    </button>
                    <button onClick={() => handleDelete(resume.id)} className="px-3 py-1.5 rounded text-risk-high font-body-sm">
                      删除
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
