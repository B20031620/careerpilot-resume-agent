import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ResumeAnalysisPage from './pages/ResumeAnalysisPage'
import ResumePolishPage from './pages/ResumePolishPage'
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
      navigate('/resume-analysis')
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
        isLoggedIn() ? <Navigate to="/resume-analysis" replace /> : <LoginPage onLogin={handleLogin} />
      } />
      <Route element={
        <RequireAuth>
          <AppLayout user={user} onLogout={handleLogout} />
        </RequireAuth>
      }>
        <Route index element={<Navigate to="/resume-analysis" replace />} />
        <Route path="dashboard" element={<Navigate to="/resume-analysis" replace />} />
        <Route path="resume-analysis" element={<ResumeAnalysisPage />} />
        <Route path="resume-polish" element={<ResumePolishPage />} />
        <Route path="mock-interview" element={<MockInterviewPage />} />
        <Route path="workplace-help" element={<WorkplaceHelpPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/resume-analysis" replace />} />
    </Routes>
  )
}
