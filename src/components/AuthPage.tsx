import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'

type Mode = 'login' | 'signup'

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: authError } =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password })

      if (authError) {
        setError(authError.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-900/60">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-white">
            Orçamento Familiar
          </h1>
          <p className="text-sm text-slate-300">
            {isLogin
              ? 'Entre com seu e-mail e senha para acessar.'
              : 'Crie sua conta para começar a organizar seu orçamento.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm text-slate-100">
            E-mail
            <input
              type="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:border-emerald-400 focus:outline-none"
              placeholder="voce@email.com"
              autoComplete="email"
            />
          </label>

          <label className="block text-sm text-slate-100">
            Senha
            <input
              type="password"
              required
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:border-emerald-400 focus:outline-none"
              placeholder="Sua senha"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </label>

          {error && (
            <div className="rounded-md border border-rose-500/60 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? isLogin
                ? 'Entrando...'
                : 'Criando conta...'
              : isLogin
                ? 'Entrar'
                : 'Criar conta'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(isLogin ? 'signup' : 'login')
            setError(null)
          }}
          className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-200"
        >
          {isLogin
            ? 'Nao tem conta? Criar uma agora.'
            : 'Ja tem conta? Entrar.'}
        </button>
      </div>
    </div>
  )
}
