import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChatBox } from '../components/ChatBox'
import { stories } from '../constants/stories'
import { useGameSessionContext } from '../contexts/useGameSessionContext'
import { submitFinalAnswer } from '../services/api'

const MAX_QUESTIONS = 5

export function GamePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const story = stories.find((item) => item.id === id)
  const { sessions, ensureSession, askQuestion, revealBottom, resetSession } = useGameSessionContext()

  const sessionParam = searchParams.get('session')
  const sessionId = useMemo(
    () => sessionParam || `session-${crypto.randomUUID()}`,
    [sessionParam]
  )
  const currentSession = sessions[sessionId]
  const askedCount = currentSession?.askedCount ?? 0
  const hasReachedQuestionLimit = askedCount >= MAX_QUESTIONS
  const canAskQuestion = askedCount < MAX_QUESTIONS
  const isGameEnded = currentSession?.isBottomRevealed || false

  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([])
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [displayedSurface, setDisplayedSurface] = useState('')
  const [showContent, setShowContent] = useState(false)
  const [showMessages, setShowMessages] = useState(false)
  const [showFinalAnswerInput, setShowFinalAnswerInput] = useState(false)
  const [finalAnswer, setFinalAnswer] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false)
  const [showWrongFeedback, setShowWrongFeedback] = useState(false)
  const [showFallbackHint, setShowFallbackHint] = useState(false)
  const [showAbandonModal, setShowAbandonModal] = useState(false)

  const canSubmitBottomAnswer = showFinalAnswerInput && hasReachedQuestionLimit

  useEffect(() => {
    if (!story) return
    if (!sessionParam) {
      setSearchParams({ session: sessionId }, { replace: true })
    }
    ensureSession(sessionId, story.id)
  }, [ensureSession, sessionId, sessionParam, setSearchParams, story])

  useEffect(() => {
    if (!currentSession?.records.length) {
      setMessages([
        { role: 'ai', content: '欢迎来到审讯室。我只会回答“是”“否”或“无关”。开始提问吧。' }
      ])
      return
    }

    setMessages(
      currentSession.records.flatMap((record) => [
        { role: 'user' as const, content: record.question },
        { role: 'ai' as const, content: record.answer }
      ])
    )
  }, [currentSession?.records])

  useEffect(() => {
    if (!story) return

    setIsPageLoading(true)
    setShowContent(false)
    setShowMessages(false)
    setDisplayedSurface('')

    const loadingTimer = window.setTimeout(() => {
      setIsPageLoading(false)
      setShowContent(true)

      let index = 0
      const typeTimer = window.setInterval(() => {
        setDisplayedSurface(story.surface.slice(0, index))
        index += 1
        if (index > story.surface.length) {
          window.clearInterval(typeTimer)
          window.setTimeout(() => setShowMessages(true), 400)
        }
      }, 35)
    }, 650)

    return () => window.clearTimeout(loadingTimer)
  }, [story])

  useEffect(() => {
    if (story && !isGameEnded && hasReachedQuestionLimit) {
      setShowFinalAnswerInput(true)
    }
  }, [hasReachedQuestionLimit, isGameEnded, story])

  useEffect(() => {
    if (!error) return
    const timer = window.setTimeout(() => setError(null), 5000)
    return () => window.clearTimeout(timer)
  }, [error])

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !story || !canAskQuestion || isGameEnded || showFinalAnswerInput) return

    const trimmedMessage = message.trim()
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: trimmedMessage },
      { role: 'ai', content: '思考中...' }
    ])
    setIsLoading(true)
    setError(null)

    try {
      const record = await askQuestion(sessionId, story.id, trimmedMessage)
      if (record.retriesCount > 0 && record.answer !== '无关') {
        setShowFallbackHint(true)
        window.setTimeout(() => setShowFallbackHint(false), 2500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '提问失败，请重试')
      setMessages((prev) => prev.slice(0, -2))
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewBottom = () => {
    if (!story) return
    ensureSession(sessionId, story.id)
    revealBottom(sessionId)
    navigate(`/result/${sessionId}`)
  }

  const handleSubmitFinalAnswer = async () => {
    if (!finalAnswer.trim() || !story) return
    if (!canSubmitBottomAnswer) {
      setError('请先完成本轮提问，再回答汤底')
      return
    }

    setIsLoading(true)
    setError(null)

    let isCorrect = false
    try {
      const result = await submitFinalAnswer(story.id, finalAnswer.trim())
      isCorrect = result.isCorrect
    } catch (err) {
      setError(err instanceof Error ? err.message : '最终答案提交失败，请稍后重试')
      setIsLoading(false)
      return
    }

    setIsLoading(false)

    if (isCorrect) {
      setShowCorrectFeedback(true)
      window.setTimeout(() => {
        setShowCorrectFeedback(false)
        handleViewBottom()
      }, 3000)
      return
    }

    setShowWrongFeedback(true)
    window.setTimeout(() => {
      setShowWrongFeedback(false)
      handleViewBottom()
    }, 3000)
  }

  const handleEndGame = () => {
    resetSession(sessionId)
    navigate('/')
  }

  const confirmAbandonGame = () => {
    resetSession(sessionId)
    setShowAbandonModal(false)
    navigate('/')
  }

  if (isPageLoading) {
    return (
      <main className="mystery-shell flex min-h-screen items-center justify-center px-4 py-10 md:px-6">
        <div className="text-center">
          <div className="relative mx-auto mb-8 h-24 w-24">
            <div className="absolute inset-0 rounded-full border border-amber-200/20"></div>
            <div className="absolute inset-3 animate-spin rounded-full border-2 border-red-300/70 border-t-transparent"></div>
            <div className="absolute inset-8 rounded-full bg-amber-200/70 shadow-[0_0_30px_rgba(251,191,36,0.4)]"></div>
          </div>
          <h2 className="mb-2 text-2xl font-black text-amber-200">正在调取档案</h2>
          <p className="text-stone-400">暗室灯光已打开</p>
        </div>
      </main>
    )
  }

  if (!story) {
    return (
      <main className="mystery-shell min-h-screen px-4 py-10 md:px-6">
        <div className="case-panel mx-auto max-w-4xl p-6">
          <h1 className="text-2xl font-black text-stone-100">未找到故事</h1>
          <p className="mt-3 text-stone-400">请返回首页重新选择故事。</p>
          <Link className="mt-4 inline-flex rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-200" to="/">
            返回大厅
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className={`mystery-shell min-h-screen px-4 py-6 md:px-6 md:py-10 animate-pageTransition ${showContent ? 'opacity-100' : 'opacity-0'}`}>
      {showCorrectFeedback && (
        <div className="case-verdict-overlay case-verdict-overlay-correct fixed inset-0 z-50 flex items-center justify-center overflow-hidden px-4 animate-fadeIn">
          <div className="case-victory-rays"></div>
          <div className="case-victory-scan"></div>
          <div className="case-verdict-card case-verdict-card-correct text-center">
            <div className="case-verdict-kicker">CASE FILE VERIFIED</div>
            <div className="case-verdict-stamp case-verdict-stamp-correct">MATCH</div>
            <div className="case-victory-burst mx-auto mb-6">
              <div className="case-victory-ring case-victory-ring-a"></div>
              <div className="case-victory-ring case-victory-ring-b"></div>
              <div className="case-victory-ring case-victory-ring-c"></div>
              {[...Array(32)].map((_, i) => (
                <div key={i} className={`case-victory-spark case-victory-spark-${i}`}></div>
              ))}
              {[...Array(12)].map((_, i) => (
                <div key={`shard-${i}`} className={`case-victory-shard case-victory-shard-${i}`}></div>
              ))}
              <div className="case-victory-seal">
                <span>真相锁定</span>
                <strong>YES</strong>
              </div>
            </div>
            <h3 className="case-verdict-title">回答正确</h3>
            <p className="case-verdict-copy">关键线索闭合，汤底正在揭晓。</p>
            <div className="case-verdict-progress" aria-hidden="true">
              <span></span>
            </div>
          </div>
        </div>
      )}

      {showWrongFeedback && (
        <div className="case-verdict-overlay case-verdict-overlay-wrong fixed inset-0 z-50 flex items-center justify-center overflow-hidden px-4 animate-fadeIn">
          <div className="case-victory-scan"></div>
          <div className="case-verdict-card case-verdict-card-wrong text-center">
            <div className="case-verdict-kicker">CASE FILE REJECTED</div>
            <div className="case-verdict-stamp case-verdict-stamp-wrong">MISMATCH</div>
            <div className="case-wrong-mark mx-auto mb-6">
              <span></span>
              <i></i>
            </div>
            <h3 className="case-verdict-title">回答错误</h3>
            <p className="case-verdict-copy">这份口供和关键线索不吻合，汤底即将揭晓。</p>
            <div className="case-verdict-progress case-verdict-progress-wrong" aria-hidden="true">
              <span></span>
            </div>
          </div>
        </div>
      )}

      {showFallbackHint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 animate-fadeIn">
          <div className="case-panel max-w-sm p-6 text-center">
            <h3 className="mb-2 text-2xl font-bold text-amber-300">回答可能不稳定</h3>
            <p className="text-stone-300">可以换一种更明确的问法。</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl">
        <header className="case-panel animate-fadeIn p-4 md:p-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-300/80">interrogation</p>
            {isGameEnded && (
              <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                已揭晓
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-stone-100 md:text-3xl">{story.title}</h1>
          <p className="mt-3 min-h-[3rem] border-l border-red-300/30 pl-4 text-sm leading-8 text-stone-300 md:text-base">
            {displayedSurface}
            {displayedSurface.length < story.surface.length && (
              <span className="ml-1 inline-block h-5 w-0.5 animate-pulse bg-amber-200"></span>
            )}
          </p>
          <div className="mt-4 flex items-center justify-between gap-4">
            <span className="text-sm text-stone-400">
              提问次数：{askedCount}/{MAX_QUESTIONS}
            </span>
            <button onClick={() => setShowAbandonModal(true)} className="text-sm text-stone-500 transition-colors hover:text-stone-300">
              放弃游戏
            </button>
          </div>
        </header>

        {showMessages && (
          <section className="case-panel mt-4 h-[350px] overflow-hidden animate-fadeIn animate-delay-300 md:mt-6 md:h-[450px]">
            <ChatBox
              messages={messages}
              onSend={handleSendMessage}
              isLoading={isLoading}
              disabled={!canAskQuestion || isGameEnded || showFinalAnswerInput}
            />
          </section>
        )}

        {showFinalAnswerInput && (
          <section className="case-panel mt-4 p-6 animate-fadeIn">
            <h3 className="mb-4 text-lg font-black text-amber-200">最终口供</h3>
            <p className="mb-4 text-stone-300">根据你收集的线索，还原整个故事的真相。</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={finalAnswer}
                onChange={(event) => setFinalAnswer(event.target.value)}
                placeholder="输入你的最终答案..."
                className="min-w-0 flex-1 rounded-lg border border-amber-100/15 bg-black/40 px-4 py-3 text-stone-100 placeholder-stone-500 transition-all focus:border-amber-300/70 focus:outline-none focus:ring-1 focus:ring-amber-300/40"
              />
              <button
                onClick={handleSubmitFinalAnswer}
                disabled={!finalAnswer.trim() || !canSubmitBottomAnswer || isLoading}
                className={`rounded-lg px-6 py-3 text-sm font-semibold transition-all ${!finalAnswer.trim() || !canSubmitBottomAnswer || isLoading ? 'cursor-not-allowed bg-stone-800 text-stone-500' : 'bg-amber-300 text-stone-950 hover:bg-amber-200 hover:scale-105 active:scale-95'}`}
              >
                {isLoading ? '提交中' : '提交答案'}
              </button>
            </div>
          </section>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-300/30 bg-red-950/30 p-4 animate-fadeIn">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-red-300">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 transition-colors hover:text-red-300">
                关闭
              </button>
            </div>
          </div>
        )}

        {!canAskQuestion && !isGameEnded && !showFinalAnswerInput && (
          <div className="mt-4 rounded-lg border border-amber-300/30 bg-amber-950/20 p-4 animate-fadeIn">
            <p className="text-sm text-amber-200">已达到最大提问次数，请给出最终答案。</p>
          </div>
        )}

        {showMessages && !showFinalAnswerInput && (
          <footer className="mt-4 flex flex-col gap-3 animate-fadeIn animate-delay-600 sm:flex-row md:mt-6">
            <button onClick={handleViewBottom} className="inline-flex items-center justify-center rounded-lg bg-amber-300 px-6 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-200 hover:scale-105 active:scale-95">
              查看汤底
            </button>
            <button onClick={handleEndGame} className="inline-flex items-center justify-center rounded-lg border border-amber-100/15 px-6 py-3 text-sm font-semibold text-stone-300 transition hover:border-amber-100/30 hover:bg-stone-900">
              结束游戏
            </button>
          </footer>
        )}

        {showAbandonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
            <div className="case-panel w-full max-w-sm p-6 shadow-xl">
              <h3 className="mb-2 text-lg font-semibold text-stone-100">确认放弃游戏？</h3>
              <p className="mb-6 text-sm text-stone-400">放弃后当前游戏进度会被清除。</p>
              <div className="flex gap-3">
                <button onClick={() => setShowAbandonModal(false)} className="flex-1 rounded-lg border border-amber-100/15 px-4 py-2 text-sm font-semibold text-stone-300 transition hover:border-amber-100/30 hover:bg-stone-900">
                  取消
                </button>
                <button onClick={confirmAbandonGame} className="flex-1 rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-200">
                  确认放弃
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
