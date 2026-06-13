import { useContext } from 'react'
import { GameSessionContext } from './gameSessionContextValue'

export function useGameSessionContext() {
  const context = useContext(GameSessionContext)
  if (!context) {
    throw new Error('useGameSessionContext 必须在 GameSessionProvider 中使用')
  }
  return context
}
