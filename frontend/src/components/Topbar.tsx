import type { UserInfo } from '../api/auth'

interface Props {
  user: UserInfo | null
  onLogout: () => void
}

export default function Topbar({ user, onLogout }: Props) {
  return (
    <header className="bg-surface/80 backdrop-blur-md h-16 px-gutter flex justify-between items-center z-40 border-b border-border-subtle shrink-0">
      <div className="flex items-center gap-3">
        {user && (
          <span className="font-body-sm text-text-secondary">
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
