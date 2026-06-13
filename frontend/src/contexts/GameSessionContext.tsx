import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { askAI } from '../services/api'
import { stories } from '../constants/stories'
import type { TAskRecord, TGameSessionState, TTriAnswer } from '../types/game'
import { GameSessionContext } from './gameSessionContextValue'

const MAX_QUESTIONS = 5
const STORAGE_KEY = 'ai-haigui-game-sessions'

function readSessionsFromStorage(): Record<string, TGameSessionState> {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY)
    if (!rawData) {
      return {}
    }
    const parsed = JSON.parse(rawData) as Record<string, TGameSessionState>
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
        const { answer, isFallback, retriesCount } = await askAI(question, story)
        
        // 验证回答是否符合规范
        const validAnswers: TTriAnswer[] = ['是', '否', '无关']
        const validatedAnswer: TTriAnswer = validAnswers.includes(answer as TTriAnswer)
          ? (answer as TTriAnswer)
          : '无关'
        const record: TAskRecord = {
          id: crypto.randomUUID(),
          question,
          answer: validatedAnswer,
          timestamp: new Date().toISOString(),
          retriesCount: isFallback ? Math.max(1, retriesCount) : retriesCount
        }

        setSessions((prevSessions) => {
          const currentSession = prevSessions[sessionId] ?? {
            sessionId,
            storyId,
            askedCount: 0,
            maxQuestions: MAX_QUESTIONS,
            isBottomRevealed: false,
            records: []
          }
          if (!currentSession || currentSession.askedCount >= currentSession.maxQuestions) {
            return prevSessions
          }

          const updatedSession = {
            ...currentSession,
            askedCount: currentSession.askedCount + 1,
            records: [
              ...currentSession.records,
              record
            ]
          }

          return {
            ...prevSessions,
            [sessionId]: updatedSession
          }
        })

        return record
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
    setSessions((prevSessions) => {
      if (!prevSessions[sessionId]) {
        return prevSessions
      }
      const clonedSessions = { ...prevSessions }
      delete clonedSessions[sessionId]
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
