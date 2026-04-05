import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 text-center shadow-lg">
        <p className="text-sm text-amber-400">404</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-100">页面不存在</h1>
        <p className="mt-3 text-sm text-slate-400">
          你访问的页面不存在，请返回游戏大厅继续。
        </p>
        <Link
          className="mt-5 inline-flex rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
          to="/"
        >
          返回大厅
        </Link>
      </section>
    </main>
  )
}
