import { GameCard } from '../components/GameCard'
import { stories } from '../constants/stories'

export function HomePage() {
  // 按难度分组故事
  const storiesByDifficulty = {
    '简单': stories.filter(story => story.difficulty === '简单'),
    '中等': stories.filter(story => story.difficulty === '中等'),
    '困难': stories.filter(story => story.difficulty === '困难')
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 md:px-6">
      <header className="mb-8">
        <p className="text-sm tracking-wide text-amber-400">MYSTERY INFERENCE GAME</p>
        <h1 className="mt-2 text-4xl font-bold text-slate-100 md:text-5xl">AI海龟汤</h1>
        <p className="mt-4 max-w-2xl text-slate-400">
          欢迎来到悬疑推理大厅。选择一个故事，通过不断提问让 AI 仅用“是 / 否 /
          无关”回应，逐步拼出真相。
        </p>
      </header>

      {/* 简单难度 */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-amber-400">简单难度</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {storiesByDifficulty['简单'].map((story) => (
            <GameCard key={story.id} story={story} />
          ))}
        </div>
      </section>

      {/* 中等难度 */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-amber-400">中等难度</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {storiesByDifficulty['中等'].map((story) => (
            <GameCard key={story.id} story={story} />
          ))}
        </div>
      </section>

      {/* 困难难度 */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-amber-400">困难难度</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {storiesByDifficulty['困难'].map((story) => (
            <GameCard key={story.id} story={story} />
          ))}
        </div>
      </section>
    </main>
  )
}
