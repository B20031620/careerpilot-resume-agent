import { useState } from 'react'
import { login, register } from '../api/auth'

interface Props {
  onLogin: () => void
}

export default function LoginPage({ onLogin }: Props) {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError(null)
    try {
      if (isRegister) {
        await register(email.trim(), password, displayName.trim() || undefined)
      } else {
        await login(email.trim(), password)
      }
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="w-full max-w-md bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
        <div className="text-center mb-6">
          <span className="material-symbols-outlined text-5xl text-agent-accent mb-3">psychology</span>
          <h1 className="font-h1 text-h1 text-primary">CareerPilot</h1>
          <p className="font-body-md text-text-secondary mt-1">AI 简历助手</p>
        </div>

        <h2 className="font-h2 text-h2 font-bold text-text-primary mb-4">
          {isRegister ? '注册' : '登录'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-risk-high/10 border border-risk-high/30 rounded-lg">
            <p className="font-body-md text-risk-high">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block font-body-md text-text-primary font-medium mb-1">邮箱</label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-border-subtle rounded-lg font-body-md text-text-primary bg-surface focus:outline-none focus:border-agent-accent"
              placeholder="请输入邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {isRegister && (
            <div>
              <label className="block font-body-md text-text-primary font-medium mb-1">昵称（可选）</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border-subtle rounded-lg font-body-md text-text-primary bg-surface focus:outline-none focus:border-agent-accent"
                placeholder="如何称呼您"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block font-body-md text-text-primary font-medium mb-1">密码</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-border-subtle rounded-lg font-body-md text-text-primary bg-surface focus:outline-none focus:border-agent-accent"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary font-body-md py-3 rounded-lg hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
          >
            {loading ? '请稍候...' : isRegister ? '注册' : '登录'}
          </button>
        </form>

        <p className="font-body-sm text-text-secondary mt-4 text-center">
          {isRegister ? '已有账号？' : '没有账号？'}
          <button
            onClick={() => { setIsRegister(!isRegister); setError(null) }}
            className="text-agent-accent hover:underline ml-1"
          >
            {isRegister ? '去登录' : '去注册'}
          </button>
        </p>

        <p className="font-body-sm text-on-surface-variant mt-3 text-center">
          本地演示可用: demo@careerpilot.local / demo123456
        </p>
      </div>
    </div>
  )
}
