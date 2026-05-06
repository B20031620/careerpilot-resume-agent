import { useEffect, useState } from 'react'
import { fetchModelStatus, testModelConnection } from '../api/settings'

interface ModelStatus {
  provider: string
  model: string
  base_url: string
  api_key_configured: boolean
  api_key_masked: string | null
  connected: boolean | null
  last_checked: string | null
  error: string | null
}

export default function SettingsPage() {
  const [status, setStatus] = useState<ModelStatus | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    fetchModelStatus().then(setStatus).catch(() => {})
  }, [])

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testModelConnection()
      setTestResult(result)
      // Refresh status
      const newStatus = await fetchModelStatus()
      setStatus(newStatus)
    } catch {
      setTestResult({ success: false, message: '连接测试失败，请检查后端服务' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="max-w-container-max-width mx-auto w-full">
      <header className="mb-6">
        <h2 className="font-h2 text-h2 font-bold text-text-primary">设置</h2>
        <p className="font-body-md text-text-secondary mt-1">管理模型配置与系统状态</p>
      </header>

      <div className="max-w-2xl space-y-6">
        {/* Model Config */}
        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
          <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-6">大模型配置</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border-subtle">
              <span className="font-body-md text-text-secondary">模型服务</span>
              <span className="font-body-md text-text-primary font-medium">{status?.provider ?? 'DeepSeek'}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border-subtle">
              <span className="font-body-md text-text-secondary">当前模型</span>
              <span className="font-body-md text-text-primary font-medium">{status?.model ?? 'deepseek-v4-pro'}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border-subtle">
              <span className="font-body-md text-text-secondary">Base URL</span>
              <span className="font-body-md text-text-primary font-medium">{status?.base_url ?? 'https://api.deepseek.com'}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border-subtle">
              <span className="font-body-md text-text-secondary">API Key</span>
              <span className="font-body-md text-text-primary font-medium">
                {status?.api_key_configured ? (status.api_key_masked ?? 'sk-****') : '未配置'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="font-body-md text-text-secondary">连接状态</span>
              <span className="flex items-center gap-2">
                {status?.connected === true && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-risk-low" />
                    <span className="font-body-md text-risk-low font-medium">已连接</span>
                  </>
                )}
                {status?.connected === false && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-risk-high" />
                    <span className="font-body-md text-risk-high font-medium">连接失败</span>
                  </>
                )}
                {status?.connected === null && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-on-surface-variant" />
                    <span className="font-body-md text-on-surface-variant">未检测</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {status?.error && (
            <div className="mt-4 p-3 bg-error-container/20 border border-error-container rounded-lg">
              <p className="font-body-sm text-risk-high">{status.error}</p>
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-5 py-2.5 bg-primary text-on-primary rounded-lg font-status text-status flex items-center gap-2 hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">network_check</span>
              {testing ? '测试中...' : '测试连接'}
            </button>
            {status?.last_checked && (
              <span className="font-body-sm text-on-surface-variant">
                上次检测: {status.last_checked}
              </span>
            )}
          </div>

          {testResult && (
            <div className={`mt-4 p-3 rounded-lg border ${testResult.success ? 'bg-risk-low/10 border-risk-low/30' : 'bg-error-container/20 border-error-container'}`}>
              <p className={`font-body-md ${testResult.success ? 'text-risk-low' : 'text-risk-high'}`}>
                {testResult.message}
              </p>
            </div>
          )}
        </div>

        {/* Config Guide */}
        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-panel-padding shadow-sm">
          <h3 className="font-h3 text-h3 font-semibold text-text-primary mb-4">配置说明</h3>
          <div className="space-y-3 font-body-md text-text-secondary">
            <p>在项目根目录的 <code className="px-1 py-0.5 bg-surface-container rounded text-text-primary font-body-sm">.env</code> 文件中配置以下环境变量：</p>
            <div className="bg-surface p-4 rounded-lg font-body-sm text-text-primary space-y-1">
              <p>LLM_PROVIDER=deepseek</p>
              <p>DEEPSEEK_API_KEY=your_api_key_here</p>
              <p>DEEPSEEK_BASE_URL=https://api.deepseek.com</p>
              <p>DEEPSEEK_MODEL=deepseek-v4-pro</p>
            </div>
            <p className="font-body-sm text-risk-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              请勿将真实 API Key 提交到 Git 仓库
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
