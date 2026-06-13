import { createBrowserRouter } from 'react-router-dom'
import { GamePage } from './pages/GamePage'
import { HomePage } from './pages/HomePage'
import { ResultPage } from './pages/ResultPage'
import { NotFoundPage } from './pages/NotFoundPage'

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />
  },
  {
    path: '/game/:id',
    element: <GamePage />
  },
  {
    path: '/result/:sessionId',
    element: <ResultPage />
  },
  {
    path: '*',
    element: <NotFoundPage />
  }
])
