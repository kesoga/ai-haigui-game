import { GameCard } from '../components/GameCard'
import { stories } from '../constants/stories'
import type { TDifficulty } from '../types/game'

const difficultyOrder: Array<{ key: TDifficulty; label: string }> = [
  { key: '简单', label: '简单难度' },
  { key: '中等', label: '中等难度' },
  { key: '困难', label: '困难难度' }
]

export function HomePage() {
  const storiesByDifficulty = {
    简单: stories.filter((story) => story.difficulty === '简单'),
    中等: stories.filter((story) => story.difficulty === '中等'),
    困难: stories.filter((story) => story.difficulty === '困难')
  }

  return (
    <main className="mystery-shell min-h-screen px-4 py-8 md:px-6 md:py-12">
      <header className="case-hero mx-auto mb-10 max-w-6xl">
        <div className="case-stamp">CASE ROOM</div>
        <p className="text-xs font-semibold uppercase tracking-[0.34em] text-red-300/80">MYSTERY INFERENCE GAME</p>
        <h1 className="mt-3 text-4xl font-black text-stone-100 md:text-6xl">AI 海龟汤</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300 md:text-base">
          档案已经摊开，灯光只照亮一半真相。选择一个案件，用“是 / 否 / 无关”一步步逼近汤底。
        </p>
      </header>

      {difficultyOrder.map(({ key, label }) => (
        <section className="mx-auto mb-10 max-w-6xl" key={key}>
          <div className="case-section-title">
            <span>{label}</span>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {storiesByDifficulty[key].map((story) => (
              <GameCard key={story.id} story={story} />
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
