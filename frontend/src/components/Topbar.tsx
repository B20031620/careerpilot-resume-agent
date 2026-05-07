import { useEffect, useMemo, useState } from 'react'
import type { UserInfo } from '../api/auth'
import { listResumes, type ResumeListItem } from '../api/resumes'
import { getCurrentResumeId, onCurrentResumeChange, setCurrentResumeId } from '../utils/currentResume'

interface Props {
  user: UserInfo | null
  onLogout: () => void
}

export default function Topbar({ user, onLogout }: Props) {
  const [resumes, setResumes] = useState<ResumeListItem[]>([])
  const [currentId, setCurrentId] = useState(getCurrentResumeId())

  const refreshResumes = (preferredId = getCurrentResumeId()) => {
    return listResumes()
      .then((data) => {
        setResumes(data)
        const stored = preferredId || getCurrentResumeId()
        if (stored && data.some((resume) => resume.id === stored)) {
          setCurrentId(stored)
        } else if (data[0]) {
          setCurrentResumeId(data[0].id)
          setCurrentId(data[0].id)
        } else {
          if (getCurrentResumeId()) setCurrentResumeId('')
          setCurrentId('')
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    refreshResumes()
    return onCurrentResumeChange((resumeId) => {
      setCurrentId(resumeId)
      refreshResumes(resumeId)
    })
  }, [])

  const currentResume = useMemo(
    () => resumes.find((resume) => resume.id === currentId) || null,
    [currentId, resumes],
  )

  return (
    <header className="bg-surface/80 backdrop-blur-md h-16 px-gutter flex justify-between items-center z-40 border-b border-border-subtle shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-body-sm text-text-secondary shrink-0">当前简历</span>
        <select
          className="max-w-[320px] px-3 py-1.5 rounded-lg border border-border-subtle bg-surface font-body-sm text-text-primary"
          value={currentId}
          onChange={(e) => {
            setCurrentResumeId(e.target.value)
            setCurrentId(e.target.value)
          }}
        >
          {resumes.length === 0 ? (
            <option value="">暂无简历</option>
          ) : (
            resumes.map((resume) => (
              <option key={resume.id} value={resume.id}>{resume.title}</option>
            ))
          )}
        </select>
        {currentResume && (
          <span className="font-body-sm text-on-surface-variant hidden xl:inline">
            {currentResume.parse_status}
          </span>
        )}
        {user && (
          <span className="font-body-sm text-text-secondary hidden lg:inline">
            {user.display_name || user.email}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button onClick={onLogout} className="text-on-surface-variant hover:text-risk-high transition-colors font-body-sm">
          退出
        </button>
      </div>
    </header>
  )
}
