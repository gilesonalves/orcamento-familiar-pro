import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

type QuickExpenseData = {
  valor: number
  observacao: string
}

type Props = {
  open: boolean
  onClose: () => void
  onSubmit: (data: QuickExpenseData) => void
}

const defaultForm = {
  valor: '',
  observacao: '',
}

export function QuickExpenseModal({ open, onClose, onSubmit }: Props) {
  const [form, setForm] = useState(defaultForm)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(defaultForm)
      setError('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const value = form.valor.replace(',', '.')
    const valor = Number(value)
    if (!Number.isFinite(valor) || valor <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }

    onSubmit({
      valor,
      observacao: form.observacao.trim(),
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 shadow-xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h4 className="text-sm font-semibold text-slate-100">
            Despesa rápida
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            Fechar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
          <label className="block text-sm text-slate-100">
            Valor
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              autoFocus
              value={form.valor}
              onChange={event => {
                setForm({ ...form, valor: event.target.value })
                if (error) setError('')
              }}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="block text-sm text-slate-100">
            Observação (opcional)
            <textarea
              rows={3}
              value={form.observacao}
              onChange={event => setForm({ ...form, observacao: event.target.value })}
              className="mt-1 w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          {error && <p className="text-xs text-rose-300">{error}</p>}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-emerald-500"
            >
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
