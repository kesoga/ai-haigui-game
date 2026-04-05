import { useState, useEffect, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { stories } from '../constants/stories'
import { useGameSessionContext } from '../contexts/GameSessionContext'
import { ChatBox } from '../components/ChatBox'



export function GamePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const story = stories.find((item) => item.id === id)
  const { sessions, ensureSession, askQuestion, revealBottom, resetSession } = useGameSessionContext()
  
  // 使用storyId作为sessionId的基础，确保同一个游戏会话保持一致
  const sessionId = useMemo(() => `session-${id}`, [id])
  const currentSession = useMemo(
    () => sessions[sessionId],
    [sessionId, sessions]
  )
  
  // 转换记录为消息格式
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([])
  
  // 页面加载状态和汤面显示
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [displayedSurface, setDisplayedSurface] = useState('')
  const [showContent, setShowContent] = useState(false)
  const [showMessages, setShowMessages] = useState(false)
  
  // 回答反馈状态
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false)
  const [showWrongFeedback, setShowWrongFeedback] = useState(false)
  // Fallback提示状态
  const [showFallbackHint, setShowFallbackHint] = useState(false)
  
  // 最终答案输入状态
  const [showFinalAnswerInput, setShowFinalAnswerInput] = useState(false)
  const [finalAnswer, setFinalAnswer] = useState('')
  
  // 从会话记录更新消息
  useEffect(() => {
    if (!currentSession?.records || currentSession.records.length === 0) {
      // 添加欢迎消息
      setMessages([
        { role: 'ai', content: '欢迎来到AI海龟汤游戏！我会用「是」、「否」或「无关」来回答你的问题。开始提问吧！' }
      ])
    } else {
      const newMessages = currentSession.records.map((record) => [
        { role: 'user' as const, content: record.question },
        { role: 'ai' as const, content: record.answer }
      ]).flat()
      setMessages(newMessages)
    }
  }, [currentSession?.records])
  
  // 页面加载和汤面逐字显示
  useEffect(() => {
    if (story) {
      // 显示加载动画 1.5 秒
      const loadingTimer = setTimeout(() => {
        setIsPageLoading(false)
        setShowContent(true)
        
        // 开始逐字显示汤面
        let index = 0
        const surfaceText = story.surface
        const typeInterval = setInterval(() => {
          if (index <= surfaceText.length) {
            setDisplayedSurface(surfaceText.substring(0, index))
            index++
          } else {
            clearInterval(typeInterval)
            // 汤面显示完成后，延迟0.5秒显示消息
            setTimeout(() => {
              setShowMessages(true)
            }, 500)
          }
        }, 50) // 每个字 50ms
        
        return () => clearInterval(typeInterval)
      }, 1500)
      
      return () => clearTimeout(loadingTimer)
    }
  }, [story])
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAbandonModal, setShowAbandonModal] = useState(false)
  
  // 错误提示自动消失
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null)
      }, 5000) // 5秒后自动消失
      
      return () => clearTimeout(timer)
    }
  }, [error])
  
  // 确保会话存在
  useEffect(() => {
    if (story) {
      ensureSession(sessionId, story.id)
    }
  }, [sessionId, story, ensureSession])
  
  // 提问次数限制
  const MAX_QUESTIONS = 5
  const canAskQuestion = (currentSession?.askedCount ?? 0) < MAX_QUESTIONS
  const isGameEnded = currentSession?.isBottomRevealed || false
  
  // 检查是否达到提问次数上限
  useEffect(() => {
    if (story && !isGameEnded && (currentSession?.askedCount ?? 0) >= MAX_QUESTIONS) {
      // 达到提问次数上限，显示最终答案输入
      setShowFinalAnswerInput(true)
    }
  }, [currentSession?.askedCount, isGameEnded, story, MAX_QUESTIONS])
  
// 计算文本相似度
const calculateSimilarity = (text1: string, text2: string): number => {
  const cleanText1 = text1.toLowerCase().replace(/\s+/g, ' ').trim()
  const cleanText2 = text2.toLowerCase().replace(/\s+/g, ' ').trim()
  
  const words1 = cleanText1.split(' ').filter((word: string) => word.length > 1)
  const words2 = cleanText2.split(' ').filter((word: string) => word.length > 1)
  
  if (words1.length === 0 || words2.length === 0) {
    return 0
  }
  
  const matchedWords = words1.filter((word: string) => words2.includes(word))
  return matchedWords.length / Math.min(words1.length, words2.length)
}

  // 处理提问
  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !canAskQuestion || !story) return
    
    // 立即显示用户消息
    setMessages(prev => [...prev, { role: 'user', content: message.trim() }])
    // 显示加载状态消息
    setMessages(prev => [...prev, { role: 'ai', content: '思考中...' }])
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('问题:', message.trim())
      
      // 调用AI获取回答
      await askQuestion(sessionId, story.id, message.trim())
      // 消息会通过useEffect从会话记录中更新，加载状态消息会被替换
      
      // 检查是否是Fallback回答
      setTimeout(() => {
        const latestSession = sessions[sessionId]
        if (latestSession && latestSession.records.length > 0) {
          const latestRecord = latestSession.records[latestSession.records.length - 1]
          if (latestRecord.retriesCount > 0) {
            // 显示Fallback提示
            setShowFallbackHint(true)
            // 3秒后隐藏提示
            setTimeout(() => {
              setShowFallbackHint(false)
            }, 3000)
          }
        }
      }, 500) // 等待会话更新
      

    } catch (err) {
      setError('提问失败，请重试')
      // 移除刚才添加的用户消息和加载状态消息
      setMessages(prev => prev.slice(0, -2))
    } finally {
      setIsLoading(false)
    }
  }
  
  // 处理最终答案提交
  const handleSubmitFinalAnswer = () => {
    if (!finalAnswer.trim() || !story) return
    
    // 使用与提问时相同的相似度检查标准
    const similarity = calculateSimilarity(finalAnswer.trim(), story.bottom)
    const isCorrect = similarity >= 0.7
    
    console.log('最终答案:', finalAnswer.trim())
    console.log('与汤底相似度:', similarity)
    console.log('是否正确:', isCorrect)
    
    if (isCorrect) {
      // 显示正确反馈
      setShowCorrectFeedback(true)
      // 3秒后隐藏反馈并跳转到结果页面
      setTimeout(() => {
        setShowCorrectFeedback(false)
        handleViewBottom()
      }, 3000)
    } else {
      // 显示错误反馈
      setShowWrongFeedback(true)
      // 3秒后隐藏反馈并跳转到结果页面
      setTimeout(() => {
        setShowWrongFeedback(false)
        handleViewBottom()
      }, 3000)
    }
  }
  
  // 处理查看汤底
  const handleViewBottom = () => {
    if (story) {
      // 确保会话存在并包含storyId
      ensureSession(sessionId, story.id)
      revealBottom(sessionId)
      // 导航到结果页面
      navigate(`/result/${sessionId}`)
    }
  }

  // 处理结束游戏
  const handleEndGame = () => {
    if (sessionId) {
      resetSession(sessionId)
    }
    navigate('/')
  }

  // 处理放弃游戏
  const handleAbandonGame = () => {
    setShowAbandonModal(true)
  }

  // 确认放弃游戏
  const confirmAbandonGame = () => {
    if (sessionId) {
      resetSession(sessionId)
    }
    setShowAbandonModal(false)
    navigate('/')
  }

  // 加载动画
  if (isPageLoading) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 md:px-6 flex items-center justify-center">
        <div className="text-center">
          {/* 加载动画 */}
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-amber-300/30 rounded-full mx-auto animate-ping"></div>
          </div>
          <h2 className="text-2xl font-bold text-amber-400 mb-2">正在进入游戏...</h2>
          <p className="text-slate-400">准备汤面中</p>
        </div>
      </main>
    )
  }

  if (!story) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 md:px-6">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-slate-100">未找到故事</h1>
          <p className="mt-3 text-slate-400">请返回首页重新选择故事。</p>
          <Link 
            className="mt-4 inline-flex rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300" 
            to="/"
          >
            返回大厅
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className={`mx-auto min-h-screen max-w-4xl px-4 py-6 md:py-10 md:px-6 animate-pageTransition ${showContent ? 'opacity-100' : 'opacity-0'}`}>
      {/* 正确回答反馈 */}
      {showCorrectFeedback && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-fadeIn">
          <div className="text-center">
            {/* 礼花动画 */}
            <div className="relative w-64 h-64 mx-auto mb-4">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-amber-400 animate-explode"
                  style={{
                    left: '50%',
                    top: '50%',
                    animationDelay: `${i * 0.1}s`,
                    transform: `translate(-50%, -50%) rotate(${i * 18}deg) translateY(-100px)`
                  }}
                ></div>
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-8xl">🎉</div>
              </div>
            </div>
            <h3 className="text-3xl font-bold text-green-400 mb-2 animate-bounce">回答正确！</h3>
            <p className="text-xl text-green-300">太棒了！你找到了关键线索！</p>
          </div>
        </div>
      )}
      
      {/* 错误回答反馈 */}
      {showWrongFeedback && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-fadeIn">
          <div className="text-center">
            <div className="text-8xl mb-4 text-red-500 animate-shake">❌</div>
            <h3 className="text-3xl font-bold text-red-400 mb-2">回答错误</h3>
            <p className="text-xl text-red-300">再仔细想想，换个角度提问吧！</p>
          </div>
        </div>
      )}
      
      {/* Fallback提示 */}
      {showFallbackHint && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-fadeIn">
          <div className="text-center">
            <div className="text-8xl mb-4 text-amber-500 animate-pulse">⚠️</div>
            <h3 className="text-2xl font-bold text-amber-400 mb-2">回答可能不准确</h3>
            <p className="text-lg text-amber-300">请尝试重新提问，使用更清晰的表达方式</p>
          </div>
        </div>
      )}
      
      {/* 故事信息 */}
      <header className="rounded-lg border border-slate-800 bg-slate-900 p-4 md:p-6 shadow-lg animate-fadeIn">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-amber-400">游戏中</p>
          {isGameEnded && (
            <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
              已揭晓
            </span>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-100">
          {story.title}
        </h1>
        <p className="mt-3 text-slate-300 text-sm md:text-base leading-relaxed min-h-[3rem]">
          {displayedSurface}
          {displayedSurface.length < story.surface.length && (
            <span className="inline-block w-0.5 h-5 bg-amber-400 animate-pulse ml-1"></span>
          )}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-slate-400">
            提问次数：{currentSession?.askedCount ?? 0}/{MAX_QUESTIONS}
          </span>
          <button
            onClick={handleAbandonGame}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            放弃游戏
          </button>
        </div>
      </header>

      {/* 聊天区域 - 汤面显示完成后才出现 */}
      {showMessages && (
        <section className="mt-4 md:mt-6 rounded-lg border border-slate-800 bg-slate-900 shadow-lg animate-fadeIn" style={{ animationDelay: '300ms', height: '450px' }}>
          <ChatBox 
            messages={messages}
            onSend={handleSendMessage}
            isLoading={isLoading}
            disabled={!canAskQuestion || isGameEnded || showFinalAnswerInput}
          />
        </section>
      )}

      {/* 最终答案输入区域 */}
      {showFinalAnswerInput && (
        <div className="mt-4 rounded-lg border border-amber-800 bg-amber-900/20 p-6 animate-fadeIn">
          <h3 className="text-lg font-semibold text-amber-400 mb-4">🔍 请给出最终答案</h3>
          <p className="text-slate-300 mb-4">根据你收集的线索，尝试还原整个故事的真相吧！</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={finalAnswer}
              onChange={(e) => setFinalAnswer(e.target.value)}
              placeholder="输入你的最终答案..."
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/50 transition-all"
            />
            <button
              onClick={handleSubmitFinalAnswer}
              disabled={!finalAnswer.trim()}
              className={`rounded-lg px-6 py-3 text-sm font-semibold transition-all ${!finalAnswer.trim() ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-amber-400 text-slate-950 hover:bg-amber-300 hover:scale-105 active:scale-95'}`}
            >
              提交答案
            </button>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-800 bg-red-900/20 p-4 animate-fadeIn transition-all duration-300 transform hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 mr-2 animate-pulse">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p className="text-sm text-red-400">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 已达到最大提问次数提示 */}
      {!canAskQuestion && !isGameEnded && !showFinalAnswerInput && (
        <div className="mt-4 rounded-lg border border-amber-800 bg-amber-900/20 p-4 animate-fadeIn">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 mr-2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <p className="text-sm text-amber-400">已达到最大提问次数，请给出最终答案</p>
          </div>
        </div>
      )}

      {/* 底部按钮 */}
      {showMessages && !showFinalAnswerInput && (
        <footer className="mt-4 md:mt-6 flex flex-col sm:flex-row gap-3 animate-fadeIn" style={{ animationDelay: '600ms' }}>
          <button
            onClick={handleViewBottom}
            className="inline-flex items-center justify-center rounded-lg bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 hover:scale-105 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            查看汤底
          </button>
          <button
            onClick={handleEndGame}
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            结束游戏
          </button>
        </footer>
      )}

      {/* 放弃游戏确认弹窗 */}
      {showAbandonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-6 max-w-sm w-full shadow-xl">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-400/20 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">确认放弃游戏？</h3>
              <p className="text-sm text-slate-400 mb-6">放弃后当前游戏进度将被清除，无法恢复。</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAbandonModal(false)}
                  className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  取消
                </button>
                <button
                  onClick={confirmAbandonGame}
                  className="flex-1 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                >
                  确认放弃
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
