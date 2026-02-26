import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

type StatusState = {
  type: 'success' | 'error'
  message: string
} | null

const isRecoveryFlow = () => {
  const url = new URL(window.location.href)
  const blob = `${url.hash ?? ''}${url.search ?? ''}`
  return /type=recovery|access_token|refresh_token|token=|code=/.test(blob)
}

export function UpdatePassword() {
  const navigate = useNavigate()
  const { session, loading } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<StatusState>(null)
  const [saving, setSaving] = useState(false)

  const isRecovery = useMemo(() => isRecoveryFlow(), [])
  const canRenderForm = isRecovery || Boolean(session)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus(null)

    if (password.length < 6) {
      setStatus({
        type: 'error',
        message: 'A senha deve ter no minimo 6 caracteres.',
      })
      return
    }

    if (password !== confirmPassword) {
      setStatus({
        type: 'error',
        message: 'As senhas nao conferem.',
      })
      return
    }

    setSaving(true)

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Falha ao atualizar a senha.',
      })
      setSaving(false)
      return
    }

    setStatus({
      type: 'success',
      message: 'Senha atualizada com sucesso.',
    })

    await supabase.auth.signOut()
    setSaving(false)
    setTimeout(() => {
      navigate('/home', { replace: true })
    }, 1200)
  }

  if (!canRenderForm) {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center shadow-xl shadow-slate-950/70">
          <h1 className="text-lg font-semibold text-white">
            Link invalido ou expirado
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Solicite uma nova recuperacao de senha.
          </p>
          <Link
            to="/home"
            className="mt-4 inline-flex rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-400"
          >
            Voltar ao login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/70">
        <h1 className="text-xl font-semibold text-white">
          Atualizar senha
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Informe sua nova senha abaixo.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-sm text-slate-100">
            Nova senha
            <input
              type="password"
              minLength={6}
              required
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:border-emerald-400 focus:outline-none"
            />
          </label>

          <label className="block text-sm text-slate-100">
            Confirmar senha
            <input
              type="password"
              minLength={6}
              required
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:border-emerald-400 focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>

        {status && (
          <div
            className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
              status.type === 'success'
                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-100'
            }`}
          >
            {status.message}
          </div>
        )}
      </div>
    </div>
  )
}
