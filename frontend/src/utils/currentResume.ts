const CURRENT_RESUME_KEY = 'careerpilot_current_resume_id'
const CURRENT_RESUME_EVENT = 'careerpilot-current-resume-change'

export function getCurrentResumeId(): string {
  return localStorage.getItem(CURRENT_RESUME_KEY) || ''
}

export function setCurrentResumeId(resumeId: string) {
  if (resumeId) localStorage.setItem(CURRENT_RESUME_KEY, resumeId)
  else localStorage.removeItem(CURRENT_RESUME_KEY)
  window.dispatchEvent(new CustomEvent(CURRENT_RESUME_EVENT, { detail: resumeId }))
}

export function onCurrentResumeChange(handler: (resumeId: string) => void) {
  const listener = (event: Event) => {
    handler((event as CustomEvent<string>).detail || getCurrentResumeId())
  }
  window.addEventListener(CURRENT_RESUME_EVENT, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(CURRENT_RESUME_EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}
