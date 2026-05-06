import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import type { UserInfo } from '../api/auth'

interface Props {
  user: UserInfo | null
  onLogout: () => void
}

export default function AppLayout({ user, onLogout }: Props) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="ml-sidebar-width flex-1 flex flex-col h-screen overflow-hidden">
        <Topbar user={user} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto p-section-margin bg-surface-muted/30">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
