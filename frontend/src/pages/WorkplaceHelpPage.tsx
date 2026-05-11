import { useState, useEffect, useRef, useCallback } from 'react'
import {
  createChatSession,
  streamInitial,
  streamMessage,
  deleteChatSession,
  getChatSession,
  listChatSessions,
  type ChatSession,
  type ChatSessionListItem,
  type ChatMessage,
} from '../api/workplaceChat'
import { ApiError } from '../api/client'

const scenes = [
  { key: 'reply_hr', label: '回复 HR', icon: 'mail' },
  { key: 'salary_negotiation', label: '薪资谈判', icon: 'payments' },
  { key: 'delay_explanation', label: '延期说明', icon: 'schedule' },
  { key: 'promotion_discussion', label: '晋升沟通', icon: 'trending_up' },
  { key: 'resignation', label: '离职沟通', icon: 'exit_to_app' },
  { key: 'feedback_response', label: '回应反馈', icon: 'rate_review' },
]

const tones = [
  { key: 'professional', label: '专业' },
  { key: 'polite', label: '礼貌' },
  { key: 'firm', label: '坚定' },
  { key: 'concise', label: '简洁' },
]

function parseMetaFromContent(content: string): { draft_text?: string; pitfalls?: string[] } | null {
  const meta: { draft_text?: string; pitfalls?: string[] } = {}
  const draftMatch = content.match(/<<<DRAFT>>>([\s\S]*?)<<<END_DRAFT>>>/)
  if (draftMatch) meta.draft_text = draftMatch[1].trim()
  const pitfallMatches = [...content.matchAll(/<<<PITFALL>>>([\s\S]*?)<<<END_PITFALL>>>/g)]
  if (pitfallMatches.length > 0) meta.pitfalls = pitfallMatches.map((m) => m[1].trim())
  return Object.keys(meta).length > 0 ? meta : null
}

function stripMarkers(content: string): string {
  let out = content
  out = out.replace(/<<<DRAFT>>>([\s\S]*?)<<<END_DRAFT>>>/g, '')
  out = out.replace(/<<<PITFALL>>>([\s\S]*?)<<<END_PITFALL>>>/g, '')
  out = out.replace(/\n{3,}/g, '\n\n').trim()
  return out
}

function extractDraft(content: string): string | null {
  const m = content.match(/<<<DRAFT>>>([\s\S]*?)<<<END_DRAFT>>>/)
  return m ? m[1].trim() : null
}

function extractPitfalls(content: string): string[] {
  return [...content.matchAll(/<<<PITFALL>>>([\s\S]*?)<<<END_PITFALL>>>/g)].map((m) => m[1].trim())
}

export default function WorkplaceHelpPage() {
  const [selectedScene, setSelectedScene] = useState('reply_hr')
  const [selectedTone, setSelectedTone] = useState('professional')
  const [context, setContext] = useState('')
  const [session, setSession] = useState<ChatSession | null>(null)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<ChatSessionListItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [])

  useEffect(() => { scrollToBottom() }, [session, streaming, streamContent, scrollToBottom])

  useEffect(() => {
    if (!streaming && inputRef.current) {
      inputRef.current.focus()
    }
  }, [streaming, session])

  useEffect(() => {
    listChatSessions().then(setHistory).catch(() => {})
  }, [session])

  const handleCreate = async () => {
    setError(null)
    try {
      // Create session instantly (no AI wait)
      const s = await createChatSession({
        scene: selectedScene,
        tone: selectedTone,
        context: context.trim() || undefined,
      })
      setSession(s)
      setContext('')
      // Then stream the initial AI response
      startStreaming(s.id, true)
    } catch (e) {
      if (e instanceof ApiError) setError(e.detail)
      else setError('创建会话失败，请重试')
    }
  }

  const handleSend = () => {
    if (!session || !input.trim() || streaming) return
    const msg = input.trim()
    setInput('')

    // Optimistically add user message to session
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: msg,
      meta_json: null,
      created_at: new Date().toISOString(),
    }
    setSession((prev) => prev ? { ...prev, messages: [...prev.messages, tempUserMsg] } : prev)

    startStreaming(session.id, false, msg)
  }

  const startStreaming = (sessionId: string, isInitial: boolean, message?: string) => {
    setStreaming(true)
    setStreamContent('')

    const callbacks = {
      onToken: (token: string) => {
        setStreamContent((prev) => prev + token)
      },
      onDone: (data: { msg_id?: string; meta_json?: Record<string, unknown> | null }) => {
        setStreamContent((prev) => {
          // Finalize: add AI message to session
          const finalContent = prev
          const meta = parseMetaFromContent(finalContent)
          const aiMsg: ChatMessage = {
            id: data.msg_id || `ai-${Date.now()}`,
            role: 'assistant',
            content: finalContent,
            meta_json: meta,
            created_at: new Date().toISOString(),
          }
          setSession((s) => {
            if (!s) return s
            // For initial stream, no user message was added optimistically
            // For message stream, user msg was already added
            return { ...s, messages: [...s.messages, aiMsg] }
          })
          return ''
        })
        setStreaming(false)
      },
      onError: (err: string) => {
        setError(err)
        setStreamContent('')
        setStreaming(false)
      },
    }

    if (isInitial) {
      streamInitial(sessionId, callbacks)
    } else {
      streamMessage(sessionId, message || '', callbacks)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleDelete = async (sessionId: string) => {
    if (!window.confirm('确认删除这段对话？')) return
    try {
      await deleteChatSession(sessionId)
      if (session?.id === sessionId) setSession(null)
      listChatSessions().then(setHistory).catch(() => {})
    } catch { /* ignore */ }
  }

  const handleCopy = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(msgId)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const handleResumeSession = async (sessionId: string) => {
    setShowHistory(false)
    setError(null)
    try {
      const s = await getChatSession(sessionId)
      setSession(s)
    } catch {
      setError('加载对话失败')
    }
  }

  const sceneLabel = scenes.find((s) => s.key === session?.scene)?.label || scenes.find((s) => s.key === selectedScene)?.label || ''
  const toneLabel = tones.find((t) => t.key === session?.tone)?.label || tones.find((t) => t.key === selectedTone)?.label || ''

  // All displayed messages: persisted + streaming
  const displayMessages = session?.messages || []
  const currentStreamDraft = streamContent ? extractDraft(streamContent) : null
  const currentStreamPitfalls = streamContent ? extractPitfalls(streamContent) : []
  const currentStreamClean = streamContent ? stripMarkers(streamContent) : ''

  return (
    <div className="max-w-container-max-width mx-auto w-full">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-h2 text-h2 font-bold text-text-primary">职场沟通</h2>
          <p className="font-body-md text-text-secondary mt-1">AI 沟通顾问，帮你应对职场关键对话</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle text-text-primary font-body-md hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            历史对话 ({history.length})
          </button>
        )}
      </header>

      {/* History panel */}
      {showHistory && (
        <div className="mb-6 bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
            <h3 className="font-body-md text-text-primary font-medium">历史对话</h3>
            <button onClick={() => setShowHistory(false)} className="text-on-surface-variant hover:text-text-primary">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-border-subtle">
            {history.map((s) => (
              <div key={s.id} className="px-5 py-3 flex items-center gap-3 hover:bg-surface-container-low transition-colors">
                <button onClick={() => handleResumeSession(s.id)} className="flex-1 text-left flex items-center gap-3 min-w-0">
                  <span className="material-symbols-outlined text-on-primary-container shrink-0">chat</span>
                  <div className="min-w-0">
                    <p className="font-body-md text-text-primary truncate">{s.title || '对话'}</p>
                    <p className="font-body-sm text-on-surface-variant">{new Date(s.created_at).toLocaleString('zh-CN')}</p>
                  </div>
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-1 rounded text-on-surface-variant hover:text-risk-high hover:bg-risk-high/10 transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Setup or Chat */}
      {!session ? (
        /* ---- Setup Phase ---- */
        <div className="max-w-lg">
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-5 shadow-sm mb-4">
            <h3 className="font-body-md text-text-primary font-medium mb-3">沟通场景</h3>
            <div className="grid grid-cols-3 gap-2">
              {scenes.map((scene) => (
                <button
                  key={scene.key}
                  onClick={() => setSelectedScene(scene.key)}
                  className={`p-3 rounded-lg border font-body-md text-sm transition-colors flex flex-col items-center gap-1.5 ${
                    selectedScene === scene.key
                      ? 'border-agent-accent bg-agent-accent/10 text-agent-accent font-medium'
                      : 'border-border-subtle text-on-surface-variant hover:border-outline-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{scene.icon}</span>
                  {scene.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-5 shadow-sm mb-4">
            <h3 className="font-body-md text-text-primary font-medium mb-3">表达语气</h3>
            <div className="flex gap-2">
              {tones.map((tone) => (
                <button
                  key={tone.key}
                  onClick={() => setSelectedTone(tone.key)}
                  className={`flex-1 px-3 py-2 rounded-lg border font-body-md text-sm transition-colors ${
                    selectedTone === tone.key
                      ? 'border-agent-accent bg-agent-accent/10 text-agent-accent font-medium'
                      : 'border-border-subtle text-on-surface-variant hover:border-outline-variant'
                  }`}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-5 shadow-sm mb-4">
            <h3 className="font-body-md text-text-primary font-medium mb-3">描述你的情况</h3>
            <textarea
              className="w-full h-28 border border-border-subtle rounded-lg p-3 font-body-md text-text-primary bg-surface resize-none focus:outline-none focus:border-agent-accent"
              placeholder="例如：HR 发来了面试邀请，但时间与我的日程冲突，需要礼貌地请求调整时间..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-risk-high/10 border border-risk-high/30 rounded-lg">
              <p className="font-body-md text-risk-high">{error}</p>
            </div>
          )}

          <button
            onClick={handleCreate}
            className="w-full bg-primary text-on-primary font-body-md py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-colors"
          >
            <span className="material-symbols-outlined text-sm">chat</span>
            开始咨询
          </button>
        </div>
      ) : (
        /* ---- Chat Phase ---- */
        <div className="max-w-3xl mx-auto">
          <div className="mb-3 flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-[16px] text-agent-accent">{scenes.find((s) => s.key === session.scene)?.icon || 'chat'}</span>
            <span className="font-body-sm text-text-secondary">{sceneLabel} · {toneLabel}语气</span>
            <button
              onClick={() => { setSession(null); setError(null); setStreamContent('') }}
              className="ml-auto font-body-sm text-on-surface-variant hover:text-text-primary flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              新对话
            </button>
          </div>

          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm overflow-hidden">
            <div ref={chatRef} className="h-[480px] overflow-y-auto p-5 space-y-5">
              {displayMessages.map((msg) => (
                <div key={msg.id}>
                  {msg.role === 'user' ? (
                    <div className="flex gap-3 justify-end">
                      <div className="bg-secondary/10 rounded-lg p-3 max-w-[85%]">
                        <p className="font-body-md text-text-primary whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ) : (
                    <AIMessageBubble
                      msg={msg}
                      copiedId={copiedId}
                      onCopy={handleCopy}
                    />
                  )}
                </div>
              ))}

              {/* Streaming bubble */}
              {streaming && streamContent && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-agent-accent/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-agent-accent text-sm">smart_toy</span>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3 max-w-[85%] w-full">
                    <p className="font-body-md text-text-primary whitespace-pre-wrap">{currentStreamClean || '...'}</p>

                    {currentStreamDraft && (
                      <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-label-caps text-label-caps text-primary">回复草稿</span>
                          <button
                            onClick={() => handleCopy(currentStreamDraft, 'streaming')}
                            className="flex items-center gap-1 font-body-sm text-agent-accent hover:underline"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {copiedId === 'streaming' ? 'check' : 'content_copy'}
                            </span>
                            {copiedId === 'streaming' ? '已复制' : '复制'}
                          </button>
                        </div>
                        <p className="font-body-md text-text-primary whitespace-pre-wrap">{currentStreamDraft}</p>
                      </div>
                    )}

                    {currentStreamPitfalls.length > 0 && (
                      <div className="mt-3 p-3 rounded-lg bg-risk-high/5 border border-risk-high/20">
                        <span className="font-label-caps text-label-caps text-risk-high mb-1.5 block">避坑提醒</span>
                        <ul className="space-y-1">
                          {currentStreamPitfalls.map((p, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="material-symbols-outlined text-risk-high text-[14px] mt-0.5 shrink-0">block</span>
                              <span className="font-body-sm text-text-secondary">{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Streaming indicator (no content yet) */}
              {streaming && !streamContent && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-agent-accent/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined animate-spin text-agent-accent text-sm">progress_activity</span>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3">
                    <p className="font-body-sm text-on-surface-variant">正在思考...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border-subtle">
              <textarea
                ref={inputRef}
                className="w-full h-20 border border-border-subtle rounded-lg p-3 font-body-md text-text-primary bg-surface resize-none focus:outline-none focus:border-agent-accent"
                placeholder="继续描述你的情况，或追问更多建议... (Enter 发送，Shift+Enter 换行)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={streaming}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="font-body-sm text-on-surface-variant">AI 会记住对话上下文，可以多轮追问</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSession(null); setError(null); setStreamContent('') }}
                    className="px-3 py-1.5 border border-border-subtle text-text-primary rounded-lg font-body-md hover:bg-surface-container-low transition-colors"
                  >
                    结束对话
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={streaming || !input.trim()}
                    className="px-4 py-1.5 bg-primary text-on-primary rounded-lg font-body-md hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
                  >
                    发送
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-risk-high/10 border border-risk-high/30 rounded-lg">
              <p className="font-body-md text-risk-high">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AIMessageBubble({ msg, copiedId, onCopy }: {
  msg: ChatMessage
  copiedId: string | null
  onCopy: (text: string, msgId: string) => void
}) {
  const content = msg.content
  const cleanContent = stripMarkers(content)
  const draft = extractDraft(content) || msg.meta_json?.draft_text || null
  const pitfalls = extractPitfalls(content).length > 0 ? extractPitfalls(content) : (msg.meta_json?.pitfalls || [])

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-agent-accent/10 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-agent-accent text-sm">smart_toy</span>
      </div>
      <div className="bg-surface-container-low rounded-lg p-3 max-w-[85%] w-full">
        <p className="font-body-md text-text-primary whitespace-pre-wrap">{cleanContent}</p>

        {draft && (
          <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-label-caps text-label-caps text-primary">回复草稿</span>
              <button
                onClick={() => onCopy(draft, msg.id)}
                className="flex items-center gap-1 font-body-sm text-agent-accent hover:underline"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {copiedId === msg.id ? 'check' : 'content_copy'}
                </span>
                {copiedId === msg.id ? '已复制' : '复制'}
              </button>
            </div>
            <p className="font-body-md text-text-primary whitespace-pre-wrap">{draft}</p>
          </div>
        )}

        {pitfalls.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-risk-high/5 border border-risk-high/20">
            <span className="font-label-caps text-label-caps text-risk-high mb-1.5 block">避坑提醒</span>
            <ul className="space-y-1">
              {pitfalls.map((p, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="material-symbols-outlined text-risk-high text-[14px] mt-0.5 shrink-0">block</span>
                  <span className="font-body-sm text-text-secondary">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
