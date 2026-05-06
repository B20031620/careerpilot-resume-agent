import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', icon: 'dashboard', label: '工作台' },
  { to: '/resume-analysis', icon: 'analytics', label: '简历分析' },
  { to: '/job-match', icon: 'target', label: '岗位匹配' },
  { to: '/resume-polish', icon: 'edit_note', label: '简历润色' },
  { to: '/project-story', icon: 'package_2', label: '项目包装' },
  { to: '/mock-interview', icon: 'record_voice_over', label: '模拟面试' },
  { to: '/workplace-help', icon: 'chat', label: '职场沟通' },
  { to: '/reports', icon: 'history', label: '历史报告' },
]

export default function Sidebar() {
  return (
    <nav className="bg-surface fixed left-0 top-0 h-full w-sidebar-width border-r border-border-subtle flex flex-col py-panel-padding z-50">
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-primary text-on-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-lg">flight_takeoff</span>
        </div>
        <div>
          <h1 className="font-h1 text-h1 font-bold text-primary leading-tight">CareerPilot</h1>
          <p className="font-label-caps text-label-caps text-on-surface-variant">职途助手</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded transition-colors duration-150 active:scale-[0.98] ${
                isActive
                  ? 'text-secondary font-bold bg-secondary-fixed/30'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span className="font-body-md text-body-md">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="px-4 mt-auto pt-4 border-t border-border-subtle flex flex-col gap-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded transition-colors duration-150 ${
              isActive
                ? 'text-secondary font-bold bg-secondary-fixed/30'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`
          }
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="font-body-md text-body-md">设置</span>
        </NavLink>
        <button className="mt-2 w-full py-2 px-4 rounded bg-primary text-on-primary font-status text-status hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-sm">add</span>
          新建任务
        </button>
      </div>
    </nav>
  )
}
