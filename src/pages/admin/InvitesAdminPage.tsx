import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type ActionType = 'set_guest' | 'set_free'

type StatusState = {
  type: 'success' | 'error'
  message: string
} | null

const statusText = (action: ActionType, email: string, role: string) => {
  const label = action === 'set_guest' ? 'Guest' : 'Free'
  return `Email ${email} atualizado para ${label} (${role}).`
}

export function InvitesAdminPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<StatusState>(null)

  const handleSubmit = async (action: ActionType) => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      setStatus({ type: 'error', message: 'Informe um e-mail valido.' })
      return
    }

    setLoading(true)
    setStatus(null)

    const { data, error } = await supabase.functions.invoke(
      'admin-invites',
      {
        body: {
          email: trimmed,
          action,
        },
      },
    )

    if (error) {
      const statusCode = (error as { context?: Response }).context?.status
      if (statusCode === 404) {
        setStatus({
          type: 'error',
          message: 'Peça para o convidado fazer login 1x no app.',
        })
      } else {
        setStatus({
          type: 'error',
          message: error.message || 'Falha ao atualizar o convite.',
        })
      }
      setLoading(false)
      return
    }

    setStatus({
      type: 'success',
      message: statusText(action, data?.email ?? trimmed, data?.role ?? ''),
    })
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/40">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Painel Admin
            </h1>
            <p className="text-sm text-slate-400">
              Convites e roles de acesso.
            </p>
          </div>
          <Link
            to="/home"
            className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40">
          <h2 className="text-lg font-semibold text-white">
            Convidar usuario
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Informe o e-mail do usuario para alterar o role.
          </p>

          <div className="mt-4 space-y-3">
            <label className="block text-sm text-slate-100">
              E-mail
              <input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="email@exemplo.com"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:border-emerald-400 focus:outline-none"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleSubmit('set_guest')}
                disabled={loading}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Enviando...' : 'Conceder Guest'}
              </button>
              <button
                type="button"
                onClick={() => handleSubmit('set_free')}
                disabled={loading}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Enviando...' : 'Remover (voltar Free)'}
              </button>
            </div>
          </div>

          {status && (
            <div
              className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                status.type === 'success'
                  ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-100'
              }`}
            >
              {status.message}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
