import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ResumeWorkspacePage from './pages/ResumeWorkspacePage'
import ResumeAnalysisPage from './pages/ResumeAnalysisPage'
import JobMatchPage from './pages/JobMatchPage'
import ResumePolishPage from './pages/ResumePolishPage'
import ProjectStoryPage from './pages/ProjectStoryPage'
import MockInterviewPage from './pages/MockInterviewPage'
import WorkplaceHelpPage from './pages/WorkplaceHelpPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import { isLoggedIn, logout, getMe, type UserInfo } from './api/auth'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  if (!isLoggedIn()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}

export default function App() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoggedIn()) {
      getMe().then(setUser).catch(() => logout())
    }
  }, [])

  const handleLogin = () => {
    getMe().then((u) => {
      setUser(u)
      navigate('/resumes')
    })
  }

  const handleLogout = () => {
    logout()
    setUser(null)
    navigate('/login')
  }

  return (
    <Routes>
      <Route path="/login" element={
        isLoggedIn() ? <Navigate to="/resumes" replace /> : <LoginPage onLogin={handleLogin} />
      } />
      <Route element={
        <RequireAuth>
          <AppLayout user={user} onLogout={handleLogout} />
        </RequireAuth>
      }>
        <Route index element={<Navigate to="/resumes" replace />} />
        <Route path="dashboard" element={<Navigate to="/resumes" replace />} />
        <Route path="resumes" element={<ResumeWorkspacePage />} />
        <Route path="resume-analysis" element={<ResumeAnalysisPage />} />
        <Route path="job-match" element={<JobMatchPage />} />
        <Route path="resume-polish" element={<ResumePolishPage />} />
        <Route path="project-story" element={<ProjectStoryPage />} />
        <Route path="mock-interview" element={<MockInterviewPage />} />
        <Route path="workplace-help" element={<WorkplaceHelpPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/resumes" replace />} />
    </Routes>
  )
}
