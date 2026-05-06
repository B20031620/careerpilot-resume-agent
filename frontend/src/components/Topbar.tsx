export default function Topbar() {
  return (
    <header className="bg-surface/80 backdrop-blur-md h-16 px-gutter flex justify-between items-center z-40 border-b border-border-subtle shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
        <div className="h-6 w-px bg-border-subtle mx-2" />
        <button className="text-on-surface-variant hover:text-primary font-status text-status px-3 py-1.5 border border-border-subtle rounded transition-colors">
          导出报告
        </button>
        <button className="bg-surface-container-high text-primary font-status text-status px-3 py-1.5 rounded hover:bg-surface-dim transition-colors">
          核心操作
        </button>
      </div>
    </header>
  )
}
