import { useEffect, useState, type ReactNode } from 'react'
import { checkAuthStatus, loginWithPassword } from '../services/api'

interface AuthGateProps {
  children: ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  const [isChecking, setIsChecking] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    checkAuthStatus()
      .then((status) => {
        setAuthRequired(status.authRequired)
        setAuthenticated(status.authenticated)
      })
      .catch(() => {
        setAuthRequired(true)
        setAuthenticated(false)
      })
      .finally(() => setIsChecking(false))
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!password.trim()) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const status = await loginWithPassword(password)
      setAuthRequired(status.authRequired)
      setAuthenticated(status.authenticated)
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '访问密码错误')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isChecking) {
    return (
      <main className="mystery-shell flex min-h-screen items-center justify-center px-4">
        <div className="case-panel w-full max-w-sm p-6 text-center">
          <p className="text-sm text-stone-300">正在核验访问权限...</p>
        </div>
      </main>
    )
  }

  if (!authRequired || authenticated) {
    return <>{children}</>
  }

  return (
    <main className="mystery-shell flex min-h-screen items-center justify-center px-4 py-10">
      <form className="case-panel w-full max-w-sm p-6" onSubmit={handleSubmit}>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-300/80">private case room</p>
        <h1 className="mt-3 text-2xl font-black text-stone-100">输入访问密码</h1>
        <p className="mt-3 text-sm leading-6 text-stone-400">
          API Key 只保存在后端。输入密码后，浏览器只会得到一个 HttpOnly 登录凭证。
        </p>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="访问密码"
          className="mt-5 w-full rounded-lg border border-amber-100/15 bg-black/40 px-4 py-3 text-stone-100 placeholder-stone-500 transition-all focus:border-amber-300/70 focus:outline-none focus:ring-1 focus:ring-amber-300/40"
        />
        {error && (
          <p className="mt-3 rounded-lg border border-red-300/30 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={!password.trim() || isSubmitting}
          className={`mt-5 w-full rounded-lg px-4 py-3 text-sm font-semibold transition-all ${!password.trim() || isSubmitting ? 'cursor-not-allowed bg-stone-800 text-stone-500' : 'bg-amber-300 text-stone-950 hover:bg-amber-200'}`}
        >
          {isSubmitting ? '验证中' : '进入档案室'}
        </button>
      </form>
    </main>
  )
}
