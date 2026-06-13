import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { TStory } from '../types/game'

interface TGameCardProps {
  story: TStory
}

export function GameCard({ story }: TGameCardProps) {
  const gameUrl = useMemo(
    () => `/game/${story.id}?session=${crypto.randomUUID()}`,
    [story.id]
  )

  return (
    <Link
      className="case-card group block p-5 transition duration-200 hover:-translate-y-1"
      to={gameUrl}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-xl font-black text-stone-100 transition group-hover:text-amber-200">
          {story.title}
        </h2>
        <span className="case-tag">
          {story.difficulty}
        </span>
      </div>
      <p className="text-sm leading-7 text-stone-300">{story.surface}</p>
      <div className="mt-5 flex items-center justify-between border-t border-amber-200/10 pt-4">
        <span className="text-xs uppercase tracking-[0.28em] text-red-300/70">{story.type}</span>
        <span className="text-sm font-semibold text-amber-200">打开档案</span>
      </div>
    </Link>
  )
}
