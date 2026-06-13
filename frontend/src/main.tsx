import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GameSessionProvider } from './contexts/GameSessionContext'
import { AuthGate } from './components/AuthGate'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameSessionProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </GameSessionProvider>
  </StrictMode>,
)
