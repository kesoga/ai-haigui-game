import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { stories } from '../constants/stories'
import { useGameSessionContext } from '../contexts/GameSessionContext'

export function ResultPage() {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const { sessions, resetSession, ensureSession } = useGameSessionContext()
  const [isRevealed, setIsRevealed] = useState(false)
  const [curtainOpen, setCurtainOpen] = useState(false)
  const [bottomText, setBottomText] = useState('')
  const [showBottom, setShowBottom] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  const currentSession = useMemo(
    () => (sessionId ? sessions[sessionId] : undefined),
    [sessionId, sessions]
  )
  
  const storyId = currentSession?.storyId
  const selectedStory = stories.find((story) => story.id === storyId)
  const fullBottomText = selectedStory?.bottom ?? '暂无汤底内容。'

  // 确保会话存在
  useEffect(() => {
    if (sessionId) {
      // 尝试从会话中获取storyId
      if (currentSession?.storyId) {
        setIsLoading(false)
      } else {
        // 如果会话不存在，尝试从URL中获取storyId
        const urlParams = new URLSearchParams(window.location.search)
        const urlStoryId = urlParams.get('storyId')
        if (urlStoryId) {
          ensureSession(sessionId, urlStoryId)
          setIsLoading(false)
        } else {
          // 如果都没有，重定向到首页
          navigate('/')
        }
      }
    } else {
      navigate('/')
    }
  }, [sessionId, currentSession, ensureSession, navigate])

  useEffect(() => {
    if (!isLoading) {
      // 延迟开始动画
      const startDelay = setTimeout(() => {
        setIsRevealed(true)
      }, 300)
      
      return () => clearTimeout(startDelay)
    }
  }, [isLoading])

  useEffect(() => {
    if (isRevealed) {
      // 延迟打开幕布
      const curtainDelay = setTimeout(() => {
        setCurtainOpen(true)
      }, 800)
      
      return () => clearTimeout(curtainDelay)
    }
  }, [isRevealed])

  useEffect(() => {
    if (curtainOpen) {
      // 幕布打开后显示汤底
      const bottomDelay = setTimeout(() => {
        setShowBottom(true)
        // 逐字显示汤底文字
        let index = 0
        const interval = setInterval(() => {
          if (index <= fullBottomText.length) {
            setBottomText(fullBottomText.substring(0, index))
            index++
          } else {
            clearInterval(interval)
          }
        }, 30)
        
        return () => clearInterval(interval)
      }, 1000)
      
      return () => clearTimeout(bottomDelay)
    }
  }, [curtainOpen, fullBottomText])

  const handlePlayAgain = () => {
    if (sessionId) {
      resetSession(sessionId)
    }
    navigate('/')
  }

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 md:px-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-300">加载中...</p>
        </div>
      </main>
    )
  }

  if (!selectedStory) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 md:px-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-100 mb-4">未找到故事</h1>
          <p className="text-slate-400 mb-6">请返回首页重新选择故事。</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center rounded-lg bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition-all hover:bg-amber-300"
          >
            返回首页
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 md:px-6 relative overflow-hidden">
      {/* 装饰效果 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* 标题区域 */}
      <section className="text-center relative z-10">
        <div 
          className={`inline-block p-3 rounded-full bg-amber-400/20 backdrop-blur-sm transition-all duration-1000 ease-out ${isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
          </svg>
        </div>
        
        <h1 
          className={`mt-6 text-4xl font-bold text-amber-400 transition-all duration-1000 ease-out ${isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
        >
          汤底揭晓
        </h1>
        
        <div className={`w-24 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mt-4 transition-all duration-1000 ease-out delay-300 ${isRevealed ? 'opacity-100 w-24' : 'opacity-0 w-0'}`}></div>
        
        <h2 
          className={`mt-6 text-2xl font-semibold text-slate-100 transition-all duration-1000 ease-out delay-400 ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          {selectedStory.title}
        </h2>
      </section>

      {/* 幕布效果 */}
      <div className="relative mt-12">
        {/* 左幕布 */}
        <div 
          className={`absolute top-0 left-0 w-1/2 h-full bg-slate-900 z-20 transition-all duration-1500 ease-in-out ${curtainOpen ? 'transform -translate-x-full' : 'transform translate-x-0'}`}
        ></div>
        {/* 右幕布 */}
        <div 
          className={`absolute top-0 right-0 w-1/2 h-full bg-slate-900 z-20 transition-all duration-1500 ease-in-out ${curtainOpen ? 'transform translate-x-full' : 'transform translate-x-0'}`}
        ></div>
        
        {/* 汤底区域 */}
        <section className="relative z-10 rounded-lg border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-950 p-8 shadow-lg">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 to-transparent rounded-lg"></div>
            <div className="relative">
              <div className={`flex items-center mb-6 transition-all duration-500 ${showBottom ? 'opacity-100' : 'opacity-0'}`}>
                <div className="w-1 h-6 bg-amber-400 mr-3"></div>
                <p className="text-sm text-amber-400 font-medium">故事真相</p>
              </div>
              
              <div className={`border-l-2 border-slate-700 pl-6 transition-all duration-500 ${showBottom ? 'opacity-100' : 'opacity-0'}`}>
                <p className="text-slate-200 leading-relaxed whitespace-pre-line">
                  {bottomText}
                  {showBottom && bottomText.length < fullBottomText.length && (
                    <span className="inline-block w-2 h-4 bg-amber-400 animate-pulse ml-1"></span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 对话历史 */}
      {currentSession?.records.length && (
        <section 
          className={`mt-8 rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-lg transition-all duration-1000 ease-out delay-1500 ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <h2 className="text-lg font-semibold text-slate-100 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 mr-2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            推理轨迹
          </h2>
          <div className="mt-4 space-y-4">
            {currentSession.records.map((record, index) => (
              <article
                key={record.id}
                className={`rounded-lg border border-slate-800 bg-slate-950 p-4 transition-all duration-700 ease-out ${isRevealed ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
                style={{ animationDelay: `${1800 + index * 200}ms` }}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center text-slate-300 text-xs font-bold mr-4 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <div className="w-2 h-2 rounded-full bg-slate-400 mr-2"></div>
                      <p className="text-sm text-slate-300">{record.question}</p>
                    </div>
                    <div className="flex items-center mt-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400 mr-2"></div>
                      <p className="text-sm text-amber-400">{record.answer}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 操作按钮 */}
      <footer 
        className={`mt-10 text-center transition-all duration-1000 ease-out delay-2000 ${isRevealed ? 'opacity-100' : 'opacity-0'}`}
      >
        <button
          onClick={handlePlayAgain}
          className="inline-flex items-center rounded-lg bg-amber-400 px-8 py-4 text-sm font-semibold text-slate-950 transition-all hover:bg-amber-300 hover:scale-105 active:scale-95 shadow-lg relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 relative z-10">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            <path d="M15.542 8.458A2 2 0 0 1 18 9.828V12a2 2 0 0 1-2 2h-5"></path>
          </svg>
          <span className="relative z-10">再来一局</span>
        </button>
      </footer>
    </main>
  )
}
