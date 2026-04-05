import { Link } from 'react-router-dom'
import type { TStory } from '../types/game'

interface TGameCardProps {
  story: TStory
}

export function GameCard({ story }: TGameCardProps) {
  return (
    <Link
      className="group block rounded-lg border border-slate-800 bg-slate-900 p-5 shadow-lg transition duration-200 hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-amber-400/10"
      to={`/game/${story.id}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-100 transition group-hover:text-amber-300">
          {story.title}
        </h2>
        <span className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-amber-400">
          {story.difficulty}
        </span>
      </div>
      <p className="text-sm text-slate-400">{story.surface}</p>
    </Link>
  )
}
