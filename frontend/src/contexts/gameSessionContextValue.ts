import { createContext } from 'react'
import type { TAskRecord, TGameSessionState } from '../types/game'

export interface TGameSessionContextValue {
  sessions: Record<string, TGameSessionState>
  ensureSession: (sessionId: string, storyId: string) => void
  askQuestion: (sessionId: string, storyId: string, question: string) => Promise<TAskRecord>
  revealBottom: (sessionId: string) => void
  resetSession: (sessionId: string) => void
}

export const GameSessionContext = createContext<TGameSessionContextValue | null>(null)
