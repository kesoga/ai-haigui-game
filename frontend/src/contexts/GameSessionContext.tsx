import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { askAI } from '../services/api'
import { stories } from '../constants/stories'
import type { TGameSessionState, TTriAnswer } from '../types/game'

const MAX_QUESTIONS = 5
const STORAGE_KEY = 'ai-haigui-game-sessions'

interface TGameSessionContextValue {
  sessions: Record<string, TGameSessionState>
  ensureSession: (sessionId: string, storyId: string) => void
  askQuestion: (sessionId: string, storyId: string, question: string) => Promise<void>
  revealBottom: (sessionId: string) => void
  resetSession: (sessionId: string) => void
}

const GameSessionContext = createContext<TGameSessionContextValue | null>(null)

function readSessionsFromStorage(): Record<string, TGameSessionState> {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY)
    console.log('从localStorage读取数据:', rawData)
    if (!rawData) {
      console.log('localStorage中没有数据，返回空对象')
      return {}
    }
    const parsed = JSON.parse(rawData) as Record<string, TGameSessionState>
    console.log('解析后的数据:', parsed)
    return parsed
  } catch (error) {
    console.error('读取localStorage失败:', error)
    return {}
  }
}

export function GameSessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Record<string, TGameSessionState>>(
    () => readSessionsFromStorage()
  )

  useEffect(() => {
    console.log('保存到localStorage:', sessions)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  }, [sessions])

  const ensureSession = useCallback((sessionId: string, storyId: string) => {
    setSessions((prevSessions) => {
      if (prevSessions[sessionId]) {
        return prevSessions
      }
      return {
        ...prevSessions,
        [sessionId]: {
          sessionId,
          storyId,
          askedCount: 0,
          maxQuestions: MAX_QUESTIONS,
          isBottomRevealed: false,
          records: []
        }
      }
    })
  }, [])

  const askQuestion = useCallback(
    async (sessionId: string, storyId: string, question: string) => {
      ensureSession(sessionId, storyId)
      
      // 找到对应的故事
      const story = stories.find((s) => s.id === storyId)
      if (!story) {
        throw new Error('故事不存在')
      }

      try {
        // 调用AI API获取回答
        const { answer, isFallback } = await askAI(question, story)
        
        // 验证回答是否符合规范
        const validAnswers: TTriAnswer[] = ['是', '否', '无关']
        let validatedAnswer: TTriAnswer = '无关' // 默认值
        let retriesCount = 0
        
        // 如果回答符合规范，使用AI的回答
        if (validAnswers.includes(answer as TTriAnswer)) {
          validatedAnswer = answer as TTriAnswer
        } else {
          // 如果回答不符合规范，尝试从回答中提取有效答案
          if (answer.includes('是')) {
            validatedAnswer = '是'
          } else if (answer.includes('否') || answer.includes('不是')) {
            validatedAnswer = '否'
          } else {
            // 如果仍然无法确定，使用默认值并标记重试
            retriesCount = 1
          }
        }
        
        // 如果是Fallback回答，标记重试
        if (isFallback) {
          retriesCount = 1
        }

        setSessions((prevSessions) => {
          const currentSession = prevSessions[sessionId]
          if (!currentSession || currentSession.askedCount >= currentSession.maxQuestions) {
            return prevSessions
          }

          const updatedSession = {
            ...currentSession,
            askedCount: currentSession.askedCount + 1,
            records: [
              ...currentSession.records,
              {
                id: crypto.randomUUID(),
                question,
                answer: validatedAnswer,
                timestamp: new Date().toISOString(),
                retriesCount
              }
            ]
          }
          
          console.log('保存会话数据:', { sessionId, updatedSession })
          
          return {
            ...prevSessions,
            [sessionId]: updatedSession
          }
        })
      } catch (error) {
        console.error('提问失败:', error)
        throw new Error('AI回答获取失败，请重试')
      }
    },
    [ensureSession]
  )

  const revealBottom = useCallback((sessionId: string) => {
    setSessions((prevSessions) => {
      const currentSession = prevSessions[sessionId]
      if (!currentSession) {
        return prevSessions
      }
      return {
        ...prevSessions,
        [sessionId]: {
          ...currentSession,
          isBottomRevealed: true
        }
      }
    })
  }, [])

  const resetSession = useCallback((sessionId: string) => {
    console.log('重置会话:', sessionId)
    setSessions((prevSessions) => {
      if (!prevSessions[sessionId]) {
        console.log('会话不存在，无法重置')
        return prevSessions
      }
      const clonedSessions = { ...prevSessions }
      delete clonedSessions[sessionId]
      console.log('删除后的会话:', clonedSessions)
      return clonedSessions
    })
  }, [])

  const contextValue = useMemo(
    () => ({
      sessions,
      ensureSession,
      askQuestion,
      revealBottom,
      resetSession
    }),
    [askQuestion, ensureSession, resetSession, revealBottom, sessions]
  )

  return (
    <GameSessionContext.Provider value={contextValue}>
      {children}
    </GameSessionContext.Provider>
  )
}

export function useGameSessionContext() {
  const context = useContext(GameSessionContext)
  if (!context) {
    throw new Error('useGameSessionContext 必须在 GameSessionProvider 中使用')
  }
  return context
}
