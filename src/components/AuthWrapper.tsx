// src/components/AuthWrapper.tsx
import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

type AuthView = 'sign-in' | 'sign-up'

type AuthWrapperProps = {
  children: ReactNode
}

const isRunningInCapacitor = () => Capacitor.isNativePlatform()

// Tela de login/cadastro
function AuthScreen() {
  const [view, setView] = useState<AuthView>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (view === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error

        setView('sign-in')
        setPassword('')
        setEmail('') // opcional
        setError(null)
        alert('Conta criada! Confirme o e-mail que enviamos antes de entrar.')
      }
    } catch (err) {
      const rawMessage =
        err instanceof Error ? err.message : 'Falha na autenticação.'

      let friendlyMessage = rawMessage

      if (view === 'sign-up') {
        const m = rawMessage.toLowerCase()
        if (
          m.includes('already registered') ||
          m.includes('already exists') ||
          m.includes('email already')
        ) {
          friendlyMessage =
            'Este e-mail já está cadastrado. Faça login ou use "Entrar com Google".'
        }
      }

      setError(friendlyMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setError('Informe o e-mail para recuperar a senha.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const redirectTo = isRunningInCapacitor()
        ? 'gestorfamiliar://update-password'
        : `${window.location.origin}/update-password`

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (error) throw error

      setError(
        'Se o e-mail existir, enviaremos um link de recuperação em alguns minutos.',
      )
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao solicitar recuperação.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true)
    setError(null)

    try {
      const isNative = isRunningInCapacitor()

      if (isNative) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'gestorfamiliar://auth-callback',
            skipBrowserRedirect: true,
          },
        })

        if (error) throw error

        if (data?.url) {
          await Browser.open({ url: data.url })
        } else {
          throw new Error(
            'URL de login do Google não retornada pelo Supabase.',
          )
        }
      } else {
        const { origin } = window.location

        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: origin,
          },
        })

        if (error) throw error
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Falha ao entrar com a conta Google.'
      setError(message)
    } finally {
      setLoadingGoogle(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/70">
        <h1 className="text-2xl font-bold text-white mb-1">
          Orçamento Familiar
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          {view === 'sign-in'
            ? 'Entre para acessar seu orçamento.'
            : 'Crie uma conta para controlar o orçamento da família.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-100">
              E-mail
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:border-emerald-400 focus:outline-none"
              />
            </label>
          </div>

          <div>
            <label className="text-sm text-slate-100">
              Senha
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:border-emerald-400 focus:outline-none"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleResetPassword}
            className="text-xs text-emerald-400 hover:underline"
          >
            Esqueci minha senha
          </button>

          {error && (
            <div className="rounded-lg border border-rose-500/60 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? 'Enviando...'
              : view === 'sign-in'
                ? 'Entrar'
                : 'Criar conta'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-4 flex items-center gap-2 text-[11px] text-slate-500">
          <div className="h-px flex-1 bg-slate-800" />
          <span>ou</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        {/* Botão Google com seu SVG */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loadingGoogle || loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6 1.54 7.38 2.84l5.42-5.32C33.64 3.18 29.3 1 24 1 14.82 1 7.25 6.54 4.22 14.24l6.61 5.14C12.53 13.02 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.5 24.5c0-1.56-.14-3.06-.41-4.5H24v9h12.7c-.55 2.86-2.23 5.28-4.76 6.9l7.68 5.96C43.9 37.46 46.5 31.5 46.5 24.5z"
            />
            <path
              fill="#FBBC05"
              d="M10.83 28.61A14.5 14.5 0 0 1 9.5 24c0-1.61.28-3.17.78-4.61l-6.61-5.14A23.93 23.93 0 0 0 .5 24c0 3.84.92 7.46 2.54 10.67l7.79-6.06z"
            />
            <path
              fill="#34A853"
              d="M24 46.5c6.3 0 11.59-2.07 15.45-5.63l-7.68-5.96C29.67 36.35 26.96 37.5 24 37.5c-6.26 0-11.47-3.52-13.96-8.61l-7.79 6.06C7.25 41.46 14.82 46.5 24 46.5z"
            />
          </svg>
          <span>{loadingGoogle ? 'Conectando...' : 'Entrar com Google'}</span>
        </button>

        <div className="mt-4 text-center text-xs text-slate-400">
          {view === 'sign-in' ? (
            <>
              Não tem conta?{' '}
              <button
                type="button"
                onClick={() => setView('sign-up')}
                className="text-emerald-400 hover:underline"
              >
                Criar conta
              </button>
            </>
          ) : (
            <>
              Já tem conta?{' '}
              <button
                type="button"
                onClick={() => setView('sign-in')}
                className="text-emerald-400 hover:underline"
              >
                Fazer login
              </button>
            </>
          )}
        </div>

        <p className="mt-2 text-[11px] text-slate-500 text-center">
          Se criou a conta agora, confirme o e-mail antes de entrar.
        </p>
      </div>
    </div>
  )
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { session, loading } = useAuth()
  const location = useLocation()
  const blob = `${location.hash ?? ''}${location.search ?? ''}`
  const isRecovery =
    /type=recovery|access_token|refresh_token|token=|code=/.test(blob)
  const isUpdatePasswordRoute = location.pathname === '/update-password'
  const allowUnauthenticated = isUpdatePasswordRoute || isRecovery

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <p className="text-sm text-slate-400">Carregando...</p>
      </div>
    )
  }

  if (!session && !allowUnauthenticated) {
    return <AuthScreen />
  }

  return (
    <>
      {session && !allowUnauthenticated && (
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="absolute right-4 top-10 z-50 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-200 shadow-lg hover:bg-slate-800"
        >
          Sair
        </button>
      )}
      {children}
    </>
  )
}
