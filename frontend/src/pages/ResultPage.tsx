import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { stories } from '../constants/stories'
import { getLocalStoryBottom } from '../constants/storyBottoms'
import { useGameSessionContext } from '../contexts/useGameSessionContext'
import { getStoryBottom } from '../services/api'

export function ResultPage() {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const { sessions, resetSession, ensureSession } = useGameSessionContext()
  const [isRevealed, setIsRevealed] = useState(false)
  const [curtainOpen, setCurtainOpen] = useState(false)
  const [bottomText, setBottomText] = useState('')
  const [showBottom, setShowBottom] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fullBottomText, setFullBottomText] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  
  const currentSession = useMemo(
    () => (sessionId ? sessions[sessionId] : undefined),
    [sessionId, sessions]
  )
  
  const storyId = currentSession?.storyId
  const selectedStory = stories.find((story) => story.id === storyId)

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
    if (!storyId) {
      return
    }

    let isMounted = true
    setLoadError(null)
    setFullBottomText('')
    setBottomText('')
    setIsRevealed(false)
    setCurtainOpen(false)
    setShowBottom(false)

    getStoryBottom(storyId)
      .then((bottom) => {
        if (isMounted) {
          setFullBottomText(bottom)
        }
      })
      .catch(() => {
        if (isMounted) {
          const localBottom = getLocalStoryBottom(storyId)
          if (localBottom) {
            setFullBottomText(localBottom)
            return
          }
          setLoadError('汤底加载失败，请确认后端服务已启动。')
        }
      })

    return () => {
      isMounted = false
    }
  }, [reloadToken, storyId])

  useEffect(() => {
    if (!isLoading && fullBottomText) {
      // 延迟开始动画
      const startDelay = setTimeout(() => {
        setIsRevealed(true)
      }, 300)
      
      return () => clearTimeout(startDelay)
    }
  }, [fullBottomText, isLoading])

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

  if (isLoading || (selectedStory && !fullBottomText && !loadError)) {
    return (
      <main className="mystery-shell flex min-h-screen w-full items-center justify-center px-4 py-8 md:px-6">
        <div className="text-center">
          <div className="mb-4 inline-block h-16 w-16 rounded-full border-4 border-red-300/70 border-t-transparent animate-spin"></div>
          <p className="text-stone-300">正在调取封存档案...</p>
        </div>
      </main>
    )
  }

  if (!selectedStory) {
    return (
      <main className="mystery-shell flex min-h-screen w-full items-center justify-center px-4 py-8 md:px-6">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-black text-stone-100">未找到故事</h1>
          <p className="mb-6 text-stone-400">请返回首页重新选择故事。</p>
          <button
            onClick={() => setReloadToken((value) => value + 1)}
            className="inline-flex items-center rounded-lg bg-amber-300 px-6 py-3 text-sm font-semibold text-stone-950 transition-all hover:bg-amber-200"
          >
            重新加载
          </button>
          <button
            onClick={() => navigate('/')}
            className="ml-3 inline-flex items-center rounded-lg border border-amber-100/15 px-6 py-3 text-sm font-semibold text-stone-300 transition-all hover:border-amber-100/30 hover:bg-stone-900"
          >
            返回首页
          </button>
        </div>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="mystery-shell flex min-h-screen w-full items-center justify-center px-4 py-8 md:px-6">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-black text-stone-100">汤底加载失败</h1>
          <p className="mb-6 text-stone-400">{loadError}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center rounded-lg bg-amber-300 px-6 py-3 text-sm font-semibold text-stone-950 transition-all hover:bg-amber-200"
          >
            返回首页
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="mystery-shell relative min-h-screen w-full overflow-hidden px-4 py-8 md:px-6">
      <div className="mx-auto max-w-4xl">

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
          className={`mt-6 text-4xl font-black text-amber-200 transition-all duration-1000 ease-out ${isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
        >
          汤底揭晓
        </h1>
        
        <div className={`w-24 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mt-4 transition-all duration-1000 ease-out delay-300 ${isRevealed ? 'opacity-100 w-24' : 'opacity-0 w-0'}`}></div>
        
        <h2 
          className={`mt-6 text-2xl font-semibold text-stone-100 transition-all duration-1000 ease-out delay-400 ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          {selectedStory.title}
        </h2>
      </section>

      {/* 幕布效果 */}
      <div className="relative mt-12">
        {/* 左幕布 */}
        <div 
          className={`absolute top-0 left-0 w-1/2 h-full bg-stone-950 z-20 transition-all duration-1500 ease-in-out ${curtainOpen ? 'transform -translate-x-full' : 'transform translate-x-0'}`}
        ></div>
        {/* 右幕布 */}
        <div 
          className={`absolute top-0 right-0 w-1/2 h-full bg-stone-950 z-20 transition-all duration-1500 ease-in-out ${curtainOpen ? 'transform translate-x-full' : 'transform translate-x-0'}`}
        ></div>
        
        {/* 汤底区域 */}
        <section className="case-panel relative z-10 p-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-[linear-gradient(90deg,rgba(248,190,97,0.08),transparent)]"></div>
            <div className="relative">
              <div className={`flex items-center mb-6 transition-all duration-500 ${showBottom ? 'opacity-100' : 'opacity-0'}`}>
                <div className="w-1 h-6 bg-amber-400 mr-3"></div>
                <p className="text-sm font-medium text-amber-200">故事真相</p>
              </div>
              
              <div className={`border-l-2 border-red-300/25 pl-6 transition-all duration-500 ${showBottom ? 'opacity-100' : 'opacity-0'}`}>
                <p className="whitespace-pre-line leading-8 text-stone-200">
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
          className={`case-panel mt-8 p-6 transition-all duration-1000 ease-out delay-1500 ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <h2 className="flex items-center text-lg font-semibold text-stone-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 mr-2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            推理轨迹
          </h2>
          <div className="mt-4 space-y-4">
            {currentSession.records.map((record, index) => (
              <article
                key={record.id}
                className={`rounded-lg border border-amber-100/10 bg-black/30 p-4 transition-all duration-700 ease-out ${isRevealed ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
              >
                <div className="flex items-start">
                  <div className="mr-4 mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-amber-200/20 bg-amber-400/10 text-xs font-bold text-stone-300">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <div className="w-2 h-2 rounded-full bg-slate-400 mr-2"></div>
                      <p className="text-sm text-stone-300">{record.question}</p>
                    </div>
                    <div className="flex items-center mt-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400 mr-2"></div>
                      <p className="text-sm text-amber-200">{record.answer}</p>
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
          className="group relative inline-flex items-center overflow-hidden rounded-lg bg-amber-300 px-8 py-4 text-sm font-semibold text-stone-950 shadow-lg transition-all hover:bg-amber-200 hover:scale-105 active:scale-95"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 relative z-10">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            <path d="M15.542 8.458A2 2 0 0 1 18 9.828V12a2 2 0 0 1-2 2h-5"></path>
          </svg>
          <span className="relative z-10">再来一局</span>
        </button>
      </footer>
      </div>
    </main>
  )
}
