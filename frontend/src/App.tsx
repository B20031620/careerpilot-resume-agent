import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import DashboardPage from './pages/DashboardPage'
import ResumeAnalysisPage from './pages/ResumeAnalysisPage'
import JobMatchPage from './pages/JobMatchPage'
import ResumePolishPage from './pages/ResumePolishPage'
import ProjectStoryPage from './pages/ProjectStoryPage'
import MockInterviewPage from './pages/MockInterviewPage'
import WorkplaceHelpPage from './pages/WorkplaceHelpPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="resume-analysis" element={<ResumeAnalysisPage />} />
        <Route path="job-match" element={<JobMatchPage />} />
        <Route path="resume-polish" element={<ResumePolishPage />} />
        <Route path="project-story" element={<ProjectStoryPage />} />
        <Route path="mock-interview" element={<MockInterviewPage />} />
        <Route path="workplace-help" element={<WorkplaceHelpPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
